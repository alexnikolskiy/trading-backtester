// BENCH (Docker-gated) — multi-PROCESS worker throughput. Proves that M separate `worker-main`
// OS processes draining one shared Postgres queue parallelize CPU-bound (momentum) backtests across
// cores — which a single Node process structurally cannot (one event loop). Spins its own throwaway
// postgres:16-alpine, enqueues N momentum jobs, and times the drain with 1 / 2 / 4 worker processes.
//
//   pnpm --filter backtester exec tsx scripts/bench-workers.mts
//   BENCH_N=200 BENCH_CONC=1,2,4 pnpm --filter backtester exec tsx scripts/bench-workers.mts
//
// Not a CI assertion — prints a measurement table. Startup is excluded: workers are launched and warmed
// (idle-polling the empty queue) BEFORE the N jobs are enqueued and the timer starts.

import { execFileSync, spawn, type ChildProcess } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Pool } from 'pg';
import { createPool } from '../src/db/pool.js';
import { migrate, DEFAULT_MIGRATIONS_DIR } from '../src/db/migrate.js';
import { PgJobStore } from '../src/jobs/pg-job-store.js';
import type { JobStore, NewJob } from '../src/jobs/job-store.js';
import type { RunSubmitRequest } from '@trading/research-contracts';

const HERE = dirname(fileURLToPath(import.meta.url));
const APP_DIR = resolve(HERE, '..');
const N = Math.max(1, Number(process.env.BENCH_N ?? 120));
const CONC = (process.env.BENCH_CONC ?? '1,2,4').split(',').map((s) => Math.max(1, Number(s.trim())));
const PG_PORT = Number(process.env.BENCH_PG_PORT ?? 55432);
const PG_NAME = 'bench-workers-pg';
const DB_URL = `postgres://postgres:bench@127.0.0.1:${PG_PORT}/postgres`;

const now = () => process.hrtime.bigint();
const ms = (a: bigint, b: bigint) => Number(b - a) / 1e6;
const sleep = (n: number) => new Promise<void>((r) => setTimeout(r, n));

function sh(cmd: string, args: string[]): string {
  return execFileSync(cmd, args, { encoding: 'utf8' }).trim();
}

async function startPg(): Promise<void> {
  try { execFileSync('docker', ['rm', '-f', PG_NAME], { stdio: 'ignore' }); } catch { /* none */ }
  sh('docker', [
    'run', '-d', '--name', PG_NAME,
    '-e', 'POSTGRES_PASSWORD=bench', '-e', 'POSTGRES_DB=postgres',
    '-p', `${PG_PORT}:5432`, 'postgres:16-alpine',
  ]);
  // wait for readiness
  for (let i = 0; i < 60; i += 1) {
    const probe = new Pool({ connectionString: DB_URL, connectionTimeoutMillis: 1000 });
    try { await probe.query('SELECT 1'); await probe.end(); return; }
    catch { await probe.end().catch(() => {}); await sleep(1000); }
  }
  throw new Error('postgres did not become ready in 60s');
}

function stopPg(): void {
  try { execFileSync('docker', ['rm', '-f', PG_NAME], { stdio: 'ignore' }); } catch { /* none */ }
}

function momentumRequest(seed: number): RunSubmitRequest {
  return {
    mode: 'research',
    moduleRef: { id: 'smoke', version: '1.0.0' },
    datasetRef: 'smoke-btc-1m',
    symbols: ['BTCUSDT'],
    timeframe: '1m',
    period: { from: '2023-11-14T00:00:00.000Z', to: '2023-11-15T00:00:00.000Z' },
    seed,
    metrics: [],
  } as RunSubmitRequest;
}

// Insert N jobs as 'accepted' (workers only claim 'queued', so they stay idle during this slow loop).
async function insertAccepted(store: JobStore, prefix: string, n: number, atMs: number): Promise<void> {
  for (let i = 0; i < n; i += 1) {
    const runId = `${prefix}-${i}`;
    const job: NewJob = {
      jobId: randomUUID(),
      runId,
      requestFingerprint: `fp-${runId}`,
      request: momentumRequest(1000 + i),
      effectiveSeed: 1000 + i,
      datasetRef: 'smoke-btc-1m',
      runTimeoutMs: 3_600_000,
      acceptedAtMs: atMs,
    };
    await store.insertOrGet(job);
  }
}

// Flip the whole batch accepted→queued in ONE statement so all N become claimable at the same instant
// (AFTER warmup + insert), and the timer measures pure parallel drain — not the slow insert loop.
async function releaseQueued(pool: Pool, prefix: string, atMs: number): Promise<void> {
  await pool.query(
    `UPDATE backtest_job
       SET status = 'queued', queued_at_ms = $2::bigint,
           timeline_json = timeline_json || $3::jsonb
     WHERE run_id LIKE $1 AND status = 'accepted'`,
    [`${prefix}-%`, atMs, JSON.stringify([{ status: 'queued', atMs }])],
  );
}

function spawnWorker(id: string): ChildProcess {
  return spawn('pnpm', ['exec', 'tsx', 'src/worker-main.ts'], {
    cwd: APP_DIR,
    env: {
      ...process.env,
      DATABASE_URL: DB_URL,
      BACKTESTER_DATA_SOURCE: 'fixture',
      BACKTESTER_AUTO_WORKER: 'true',
      WORKER_ID: id,
      WORKER_CONCURRENCY: '1',
      WORKER_POLL_MS: '10',
      WORKER_HEARTBEAT_MS: '1000',
      WORKER_LEASE_TTL_MS: '30000',
    },
    stdio: 'ignore',
  });
}

async function activeCount(pool: Pool, prefix: string): Promise<number> {
  const r = await pool.query<{ n: string }>(
    `SELECT count(*)::text n FROM backtest_job WHERE run_id LIKE $1 AND status IN ('queued','running')`,
    [`${prefix}-%`],
  );
  return Number(r.rows[0]?.n ?? 0);
}

async function completedCount(pool: Pool, prefix: string): Promise<number> {
  const r = await pool.query<{ n: string }>(
    `SELECT count(*)::text n FROM backtest_job WHERE status = 'completed' AND run_id LIKE $1`,
    [`${prefix}-%`],
  );
  return Number(r.rows[0]?.n ?? 0);
}

async function main(): Promise<void> {
  console.log(`[bench-workers] N=${N} per round; concurrencies=${CONC.join('/')}; pg=${PG_NAME}:${PG_PORT}`);
  await startPg();
  const adminPool = createPool(DB_URL);
  try {
    await migrate(adminPool, DEFAULT_MIGRATIONS_DIR); // pre-migrate so worker startup migrate() is a no-op
    const store = new PgJobStore(adminPool);

    const results: { conc: number; drainMs: number; perRun: number; completed: number }[] = [];
    for (const conc of CONC) {
      const prefix = `r${conc}-${Date.now().toString(36)}`;
      const workers = Array.from({ length: conc }, (_, i) => spawnWorker(`${prefix}-w${i}`));
      try {
        await sleep(4000); // warmup: let workers boot + connect + idle-poll the empty queue
        await insertAccepted(store, prefix, N, Date.now()); // workers ignore 'accepted' — no draining yet
        const t0 = now();
        await releaseQueued(adminPool, prefix, Date.now()); // all N become claimable at once → timer is pure drain
        let active = await activeCount(adminPool, prefix);
        const deadline = Date.now() + 180_000;
        while (active > 0) {
          if (Date.now() > deadline) throw new Error(`drain timed out (conc=${conc}, ${active} left)`);
          await sleep(10);
          active = await activeCount(adminPool, prefix);
        }
        const drainMs = ms(t0, now());
        const completed = await completedCount(adminPool, prefix);
        results.push({ conc, drainMs, perRun: drainMs / N, completed });
        console.log(`  conc=${conc}: drain=${drainMs.toFixed(0)}ms  per-run=${(drainMs / N).toFixed(1)}ms  completed=${completed}/${N}`);
      } finally {
        for (const w of workers) w.kill('SIGTERM');
        await sleep(1500); // let them shut down gracefully
        for (const w of workers) if (!w.killed) w.kill('SIGKILL');
      }
    }

    const base = results.find((r) => r.conc === 1)?.drainMs;
    console.log('\n============== MULTI-PROCESS WORKER THROUGHPUT (momentum) ==============');
    for (const r of results) {
      const speedup = base ? base / r.drainMs : 1;
      console.log(
        `  ${r.conc} worker(s): ${r.drainMs.toFixed(0).padStart(7)} ms   ` +
          `${(r.perRun).toFixed(1).padStart(6)} ms/run   speedup ${speedup.toFixed(2)}×   (completed ${r.completed}/${N})`,
      );
    }
    console.log(`cores=${(await import('node:os')).cpus().length}  N=${N}/round`);
    console.log('=======================================================================');
  } finally {
    await adminPool.end().catch(() => {});
    stopPg();
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  stopPg();
  process.exit(1);
});

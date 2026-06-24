// Worker-node entrypoint: drain the shared Postgres queue (no HTTP). Run M of these against one
// DATABASE_URL alongside one API node (BACKTESTER_AUTO_WORKER=false). Multi-process REQUIRES Postgres.

import { buildApp, type AppHandles } from './app.js';
import { loadConfig, type AppConfig } from './config.js';
import { runWorkerLoop } from './jobs/worker.js';

export function assertWorkerConfig(config: AppConfig): void {
  if (!config.databaseUrl) {
    throw new Error(
      'worker-main requires DATABASE_URL (multi-process drains the shared Postgres queue; ' +
        'the in-memory store is per-process and cannot be shared).',
    );
  }
}

async function main(): Promise<void> {
  const config = loadConfig();
  assertWorkerConfig(config);
  const app: AppHandles = await buildApp(config);
  const ac = new AbortController();
  const deps = app.workerDeps; // exposed by buildApp (Step 4)
  const lease = { workerId: config.workerId, ttlMs: config.workerLeaseTtlMs, maxAttempts: config.workerMaxAttempts };

  // eslint-disable-next-line no-console
  console.log(`trading-backtester worker ${config.workerId} draining (concurrency=${config.workerConcurrency})`);
  const loop = runWorkerLoop(
    { ...deps, lease },
    {
      concurrency: config.workerConcurrency,
      heartbeatMs: config.workerHeartbeatMs,
      pollMs: config.workerPollMs,
      signal: ac.signal,
    },
  );

  const shutdown = async (): Promise<void> => {
    ac.abort();
    await loop;
    await app.dispose();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown());
  process.on('SIGTERM', () => void shutdown());
  await loop;
}

// Only run when executed directly (not when imported by the unit test).
if (process.argv[1] && process.argv[1].endsWith('worker-main.js')) {
  main().catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  });
}

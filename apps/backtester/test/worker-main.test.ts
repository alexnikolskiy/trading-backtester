import { describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertWorkerConfig } from '../src/worker-main.js';
import { loadConfig } from '../src/config.js';

describe('worker-main', () => {
  it('fails fast without DATABASE_URL', () => {
    const c = loadConfig({} as NodeJS.ProcessEnv); // no DATABASE_URL
    expect(() => assertWorkerConfig(c)).toThrow(/DATABASE_URL/);
  });
  it('accepts a config with databaseUrl', () => {
    const c = loadConfig({ DATABASE_URL: 'postgres://x' } as NodeJS.ProcessEnv);
    expect(() => assertWorkerConfig(c)).not.toThrow();
  });

  // Regression guard: `pnpm worker` launches via `tsx src/worker-main.ts`, so the direct-execution
  // guard MUST fire on a `.ts` entry — a `.endsWith('worker-main.js')` check silently no-op'd main()
  // under tsx (the worker process did nothing). Spawning the real entry without DATABASE_URL proves
  // main() actually RAN: it must exit non-zero with the fail-fast message. If main() never ran the
  // process would exit 0.
  it('runs main() under tsx and fails fast without DATABASE_URL', async () => {
    const appDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
    const env = { ...process.env };
    delete env.DATABASE_URL;
    delete env.BACKTESTER_TEST_DATABASE_URL;
    const { code, stderr } = await new Promise<{ code: number | null; stderr: string }>((res) => {
      const child = execFile(
        'pnpm',
        ['exec', 'tsx', 'src/worker-main.ts'],
        { cwd: appDir, env, timeout: 25_000 },
        (_err, _stdout, se) => res({ code: child.exitCode, stderr: se }),
      );
    });
    expect(code).not.toBe(0);
    expect(stderr).toMatch(/DATABASE_URL/);
  }, 30_000);
});

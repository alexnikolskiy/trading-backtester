import { describe, expect, it } from 'vitest';
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
});

import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config.js';

describe('WORKER_CONCURRENCY config', () => {
  it('defaults to 4 when unset', () => {
    const cfg = loadConfig({ ...process.env, WORKER_CONCURRENCY: undefined });
    expect(cfg.workerConcurrency).toBe(4);
  });
  it('parses an explicit value', () => {
    const cfg = loadConfig({ ...process.env, WORKER_CONCURRENCY: '8' });
    expect(cfg.workerConcurrency).toBe(8);
  });
  it('clamps values below 1 up to 1', () => {
    const cfg = loadConfig({ ...process.env, WORKER_CONCURRENCY: '0' });
    expect(cfg.workerConcurrency).toBe(1);
  });
});

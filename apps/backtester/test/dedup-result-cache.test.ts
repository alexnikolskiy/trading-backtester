import { describe, expect, it } from 'vitest';
import { InMemoryResultCache, type CacheEntry } from '../src/jobs/dedup/result-cache';

const entry = (id: string): CacheEntry => ({
  computeIdentity: id,
  requestFingerprint: 'fp',
  datasetFingerprint: 'ds',
  computeVersion: '1',
  sandboxPolicyVersion: 'sp',
  templateRef: 'sha256:abc',
  createdAtMs: 1,
});

describe('InMemoryResultCache', () => {
  it('miss then hit round-trips', async () => {
    const c = new InMemoryResultCache();
    expect(await c.lookup('k')).toBeUndefined();
    await c.put(entry('k'));
    expect(await c.lookup('k')).toEqual(entry('k'));
  });
  it('put is idempotent (first writer wins)', async () => {
    const c = new InMemoryResultCache();
    await c.put(entry('k'));
    await c.put({ ...entry('k'), templateRef: 'sha256:other' });
    expect((await c.lookup('k'))?.templateRef).toBe('sha256:abc');
  });
});

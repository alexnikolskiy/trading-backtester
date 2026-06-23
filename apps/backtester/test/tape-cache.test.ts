import { describe, expect, it } from 'vitest';
import { tapeCacheKey } from '../src/data/tape-cache.js';

describe('tapeCacheKey', () => {
  it('is independent of symbol order', () => {
    const a = tapeCacheKey({ datasetRef: 'ds', symbols: ['BTC', 'ETH'], from: '1', to: '2', timeframe: '1m' });
    const b = tapeCacheKey({ datasetRef: 'ds', symbols: ['ETH', 'BTC'], from: '1', to: '2', timeframe: '1m' });
    expect(a).toBe(b);
  });

  it('distinguishes different windows', () => {
    const a = tapeCacheKey({ datasetRef: 'ds', symbols: ['BTC'], from: '1', to: '2' });
    const b = tapeCacheKey({ datasetRef: 'ds', symbols: ['BTC'], from: '1', to: '3' });
    expect(a).not.toBe(b);
  });

  it('distinguishes datasetRef and timeframe', () => {
    const base = { symbols: ['BTC'], from: '1', to: '2' } as const;
    expect(tapeCacheKey({ ...base, datasetRef: 'a' })).not.toBe(tapeCacheKey({ ...base, datasetRef: 'b' }));
    expect(tapeCacheKey({ ...base, datasetRef: 'a', timeframe: '1m' })).not.toBe(
      tapeCacheKey({ ...base, datasetRef: 'a', timeframe: '5m' }),
    );
  });
});

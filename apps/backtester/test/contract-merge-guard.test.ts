import { describe, expect, it } from 'vitest';
import type { BacktestRunRequest } from '@trading/research-contracts';
import { CONTRACT_VERSION, PLATFORM_CONTRACT_VERSION } from '@trading/research-contracts';
import { schemaAsset, SCHEMA_IDS } from '@trading/research-contracts/research';
import type { RiskProfile, ExecutionProfile, BacktestRunResult, CanonicalRow, CanonicalRowV2 } from '@trading/research-contracts/research';

describe('additive 017 contract merge', () => {
  it('still accepts the legacy signals request shape unchanged', () => {
    const legacy: BacktestRunRequest = {
      runId: 'r0', mode: 'research', moduleRef: { id: 'smoke', version: '1.0.0' },
      datasetRef: 'smoke-btc-1m', symbols: ['BTCUSDT'], timeframe: '1m',
      period: { from: '2023-11-14T00:00:00.000Z', to: '2023-11-15T00:00:00.000Z' },
      seed: 42, metrics: [],
    };
    expect(legacy.seed).toBe(42);
    expect((legacy as { engine?: string }).engine).toBeUndefined();
  });

  it('accepts an explicit overlay-engine request with 017 fields', () => {
    const overlay: BacktestRunRequest = {
      runId: 'r1', mode: 'research', moduleRef: { id: 'shortAfterPump', version: '1.0.0' },
      overlayRefs: [{ id: 'earlyExitShortAfterPump', version: '1.0.0' }],
      datasetRef: 'smoke-btc-1m', symbols: ['BTCUSDT'], timeframe: '1m',
      period: { from: '2023-11-14T00:00:00.000Z', to: '2023-11-15T00:00:00.000Z' },
      seed: 42, metrics: [], engine: 'overlay',
    };
    expect(overlay.engine).toBe('overlay');
    expect(overlay.overlayRefs?.length).toBe(1);
  });
});

it('CONTRACT_VERSION is in lockstep with the lifted platform anchor', () => {
  expect(CONTRACT_VERSION).toBe(PLATFORM_CONTRACT_VERSION);
});

it('loads the 017 strategy-decision schema asset with its $id intact', () => {
  const schema = schemaAsset('strategy-decision');
  expect(schema.$id).toBe(SCHEMA_IDS['strategy-decision']);
  expect(typeof schema).toBe('object');
});

it('exposes engine contract types on the /research subpath', () => {
  const v2: CanonicalRowV2 = {
    schema_version: 2, minute_ts: 0, symbol: 'BTCUSDT', open: 1, high: 1, low: 1, close: 1,
    volume: 0, turnover: 0, oi_total_usd: null, funding_rate: null, liq_long_usd: null,
    liq_short_usd: null, has_oi: false, has_funding: false, has_liquidations: false,
    taker_buy_volume_usd: null, taker_sell_volume_usd: null, has_taker_flow: false,
  };
  expect(v2.schema_version).toBe(2);
  // types compile-only:
  const _r: RiskProfile | undefined = undefined; const _e: ExecutionProfile | undefined = undefined;
  const _b: BacktestRunResult | undefined = undefined; const _c: CanonicalRow | undefined = undefined;
  expect([_r, _e, _b, _c].length).toBe(4);
});

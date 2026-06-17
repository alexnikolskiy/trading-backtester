import { describe, expect, it } from 'vitest';
import { createSchemaRegistry } from '../src/engine/validation/schema-registry.js';
import { SCHEMA_IDS } from '@trading/research-contracts/research';
import { buildOverlayDataset } from '../src/engine/data-adapter.js';
import { FixtureDataPort } from '../src/data/reader.js';
import { FIXTURES_DIR } from './helpers.js';

describe('lifted 017 validation runtime', () => {
  it('compiles the core schema registry and resolves a decision branch ref', () => {
    const reg = createSchemaRegistry();
    expect(typeof reg.validateRef).toBe('function');
    // A valid minimal idle decision passes the strategy-decision IdleDecision branch
    // (IdleDecision requires only `kind: 'idle'`, additionalProperties:false).
    const okErrs = reg.validateRef(
      `${SCHEMA_IDS['strategy-decision']}#/definitions/IdleDecision`,
      { kind: 'idle' },
    );
    expect(okErrs).toEqual([]);

    // An obviously-invalid payload (wrong const + extra prop) returns errors.
    const badErrs = reg.validateRef(
      `${SCHEMA_IDS['strategy-decision']}#/definitions/IdleDecision`,
      { kind: 'enter', bogus: true },
    );
    expect(badErrs.length).toBeGreaterThan(0);
  });

  it('materializes an engine MarketTapeDataset from the fixture data port', async () => {
    const port = new FixtureDataPort(FIXTURES_DIR);
    const ds = await buildOverlayDataset(port, {
      datasetRef: 'smoke-btc-1m',
      symbols: ['BTCUSDT'],
      timeframe: '1m',
      period: { from: '2023-11-14T00:00:00.000Z', to: '2023-11-15T00:00:00.000Z' },
    });
    expect(ds.symbols()).toContain('BTCUSDT');
    expect(ds.candles('BTCUSDT').length).toBeGreaterThan(0);
  });
});

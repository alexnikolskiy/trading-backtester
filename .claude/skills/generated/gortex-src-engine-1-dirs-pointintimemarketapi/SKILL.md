---
name: gortex-src-engine-1-dirs-pointintimemarketapi
description: "Work in the src/engine +1 dirs · pointInTimeMarketApi area — 79 symbols across 5 files (94% cohesion)"
---

# src/engine +1 dirs · pointInTimeMarketApi

79 symbols | 5 files | 94% cohesion

## When to Use

Use this skill when working on files in:
- `apps/backtester/src/engine/context.ts`
- `apps/backtester/src/engine/dataset.ts`
- `apps/backtester/src/engine/market-access.ts`
- `apps/backtester/src/engine/market-tape.ts`
- `packages/research-contracts/src/research/market-tape.ts`

## Key Files

| File | Symbols |
|------|---------|
| `apps/backtester/src/engine/context.ts` | ContextBuilderBase, base, tape, constructor |
| `apps/backtester/src/engine/dataset.ts` | candles, c, symbol |
| `apps/backtester/src/engine/market-access.ts` | start, takerPoint, snap, symbol, k, ... |
| `apps/backtester/src/engine/market-tape.ts` | found, taker, taker, symbol, events, ... |
| `packages/research-contracts/src/research/market-tape.ts` | LiqPoint, OiPoint, PointInTimeMarketApi, TakerPoint, MarketTape, ... |

## Entry Points

- `apps/backtester/src/engine/market-access.ts::pointInTimeMarketApi`

## Connected Communities

- **src/engine +1 dirs · kindCoverage** (2 cross-edges)

## How to Explore

```
get_communities with id: "community-65"
smart_context with task: "understand src/engine +1 dirs · pointInTimeMarketApi", format: "gcx"
find_usages with id: "apps/backtester/src/engine/market-access.ts::pointInTimeMarketApi", format: "gcx"
```

_`format: "gcx"` returns the [GCX1 compact wire format](../../docs/wire-format.md) — round-trippable, ~27% fewer tokens than JSON. Drop it for JSON output; agents using `@gortex/wire` or the Go `github.com/gortexhq/gcx-go` package decode either._

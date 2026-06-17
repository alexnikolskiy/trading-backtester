---
name: gortex-src-engine-2-dirs
description: "Work in the src/engine +2 dirs area — 155 symbols across 9 files (89% cohesion)"
---

# src/engine +2 dirs

155 symbols | 9 files | 89% cohesion

## When to Use

Use this skill when working on files in:
- `apps/backtester/src/engine/context.ts`
- `apps/backtester/src/engine/dataset.ts`
- `apps/backtester/src/engine/indicators/engine.ts`
- `apps/backtester/src/engine/module-executor.ts`
- `apps/backtester/src/engine/overlay.ts`
- `apps/backtester/src/engine/portfolio.ts`
- `apps/backtester/src/engine/runner.ts`
- `packages/research-contracts/src/research/context.ts`
- `packages/research-contracts/src/research/decision.ts`

## Key Files

| File | Symbols |
|------|---------|
| `apps/backtester/src/engine/context.ts` | deepFreeze, obj, carriesMarket, ctx, state, ... |
| `apps/backtester/src/engine/dataset.ts` | engine, indicatorApiFor, barIndex |
| `apps/backtester/src/engine/indicators/engine.ts` | accessorAt, barIndex |
| `apps/backtester/src/engine/module-executor.ts` | executeStrategyHook, normalizeOverlay, forOverlay, ctx, disposeStrategy, ... |
| `apps/backtester/src/engine/overlay.ts` | effects, errs, OverlayDecisionSource, compose, OverlayComposer, ... |
| `apps/backtester/src/engine/portfolio.ts` | grossUnrealized, expirePending, OpenPosition, pos, initialEquity, ... |
| `apps/backtester/src/engine/runner.ts` | t, outcome, portfolio, last, outcome, ... |
| `packages/research-contracts/src/research/context.ts` | IndicatorApi |
| `packages/research-contracts/src/research/decision.ts` | StrategyDecision, OverlayDecision |

## Entry Points

- `apps/backtester/src/engine/runner.ts::runSymbol`

## Connected Communities

- **src/engine +1 dirs · evaluate** (6 cross-edges)
- **src/engine · settlePending** (2 cross-edges)
- **src/engine · buildTrade** (1 cross-edges)
- **src/engine +1 dirs · smaAsOf** (1 cross-edges)
- **src/engine +1 dirs · pointInTimeMarketApi** (1 cross-edges)
- **src/engine +1 dirs · runBacktest** (1 cross-edges)

## How to Explore

```
get_communities with id: "community-81"
smart_context with task: "understand src/engine +2 dirs", format: "gcx"
find_usages with id: "apps/backtester/src/engine/runner.ts::runSymbol", format: "gcx"
```

_`format: "gcx"` returns the [GCX1 compact wire format](../../docs/wire-format.md) — round-trippable, ~27% fewer tokens than JSON. Drop it for JSON output; agents using `@gortex/wire` or the Go `github.com/gortexhq/gcx-go` package decode either._

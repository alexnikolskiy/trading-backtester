---
name: gortex-src-engine-1-dirs-runbacktest
description: "Work in the src/engine +1 dirs · runBacktest area — 69 symbols across 8 files (90% cohesion)"
---

# src/engine +1 dirs · runBacktest

69 symbols | 8 files | 90% cohesion

## When to Use

Use this skill when working on files in:
- `apps/backtester/src/engine/artifacts.ts`
- `apps/backtester/src/engine/dataset.ts`
- `apps/backtester/src/engine/module-executor.ts`
- `apps/backtester/src/engine/overlay.ts`
- `apps/backtester/src/engine/registry.ts`
- `apps/backtester/src/engine/run-overlay.ts`
- `apps/backtester/src/engine/runner.ts`
- `packages/research-contracts/src/research/catalogs.ts`

## Key Files

| File | Symbols |
|------|---------|
| `apps/backtester/src/engine/artifacts.ts` | RunOutcome |
| `apps/backtester/src/engine/dataset.ts` | datasetRef, frozen, bars, file, fixturesDir, ... |
| `apps/backtester/src/engine/module-executor.ts` | closeAll |
| `apps/backtester/src/engine/overlay.ts` | registry |
| `apps/backtester/src/engine/registry.ts` | resolveExecutionProfile, resolveStrategy, ref, ref, ref, ... |
| `apps/backtester/src/engine/run-overlay.ts` | runOverlayBacktest, deps, engineRequest, _engine, OverlayRunDeps, ... |
| `apps/backtester/src/engine/runner.ts` | baseline, riskProfile, reqValidation, message, router, ... |
| `packages/research-contracts/src/research/catalogs.ts` | platformContractContext, knownStrategyRefs |

## Entry Points

- `apps/backtester/src/engine/runner.ts::runBacktest`

## Connected Communities

- **src/engine +1 dirs · simulateTarget** (3 cross-edges)
- **src/engine · declaredMarketKinds** (1 cross-edges)
- **backtester/test +3 dirs** (1 cross-edges)
- **src/engine · computeComparison** (1 cross-edges)
- **src/engine · findRepoRoot** (1 cross-edges)

## How to Explore

```
get_communities with id: "community-80"
smart_context with task: "understand src/engine +1 dirs · runBacktest", format: "gcx"
find_usages with id: "apps/backtester/src/engine/runner.ts::runBacktest", format: "gcx"
```

_`format: "gcx"` returns the [GCX1 compact wire format](../../docs/wire-format.md) — round-trippable, ~27% fewer tokens than JSON. Drop it for JSON output; agents using `@gortex/wire` or the Go `github.com/gortexhq/gcx-go` package decode either._

---
name: gortex-engine-sandbox-2-dirs-callhook
description: "Work in the engine/sandbox +2 dirs · callHook area — 113 symbols across 10 files (90% cohesion)"
---

# engine/sandbox +2 dirs · callHook

113 symbols | 10 files | 90% cohesion

## When to Use

Use this skill when working on files in:
- `apps/backtester/src/engine/examples/early-exit-short-after-pump.overlay.ts`
- `apps/backtester/src/engine/examples/short-after-pump.strategy.ts`
- `apps/backtester/src/engine/sandbox/context-serializer.ts`
- `apps/backtester/src/engine/sandbox/errors.ts`
- `apps/backtester/src/engine/sandbox/ipc.ts`
- `apps/backtester/src/engine/sandbox/routing.ts`
- `apps/backtester/src/engine/sandbox/sandbox-executor.ts`
- `apps/backtester/src/engine/sandbox/sandbox-session.ts`
- `packages/research-contracts/src/research/context.ts`
- `packages/research-contracts/src/research/module.ts`

## Key Files

| File | Symbols |
|------|---------|
| `apps/backtester/src/engine/examples/early-exit-short-after-pump.overlay.ts` | ctx, suffix, adverse, maxAdverseBars, earlyExitShortAfterPump.apply, ... |
| `apps/backtester/src/engine/examples/short-after-pump.strategy.ts` | rsi, windowMin, parts, history, minVolume, ... |
| `apps/backtester/src/engine/sandbox/context-serializer.ts` | bar, plainBar |
| `apps/backtester/src/engine/sandbox/errors.ts` | SandboxValidationCode |
| `apps/backtester/src/engine/sandbox/ipc.ts` | req, Request, stderrText, send |
| `apps/backtester/src/engine/sandbox/routing.ts` | ExecutorRouter |
| `apps/backtester/src/engine/sandbox/sandbox-executor.ts` | collectedErrors, ctx, err, sessionFor, driver, ... |
| `apps/backtester/src/engine/sandbox/sandbox-session.ts` | state, name, container, SessionError, stderr, ... |
| `packages/research-contracts/src/research/context.ts` | Bar, StrategyContext |
| `packages/research-contracts/src/research/module.ts` | StrategyModule |

## Entry Points

- `apps/backtester/src/engine/examples/short-after-pump.strategy.ts::shortAfterPump.onBarClose@45`
- `apps/backtester/src/engine/examples/early-exit-short-after-pump.overlay.ts::earlyExitShortAfterPump.apply@43`
- `apps/backtester/src/engine/sandbox/sandbox-executor.ts::SandboxModuleExecutor.initStrategy`

## Connected Communities

- **engine/sandbox · revalidate** (2 cross-edges)
- **engine/sandbox · receive** (2 cross-edges)
- **engine/sandbox · inspectState** (2 cross-edges)
- **engine/sandbox · sessionContainerName** (1 cross-edges)
- **src/engine · spawnSession** (1 cross-edges)
- **engine/sandbox +1 dirs · serializeContext** (1 cross-edges)
- **engine/sandbox · boundedRedactedDetail** (1 cross-edges)

## How to Explore

```
get_communities with id: "community-107"
smart_context with task: "understand engine/sandbox +2 dirs · callHook", format: "gcx"
find_usages with id: "apps/backtester/src/engine/examples/short-after-pump.strategy.ts::shortAfterPump.onBarClose@45", format: "gcx"
```

_`format: "gcx"` returns the [GCX1 compact wire format](../../docs/wire-format.md) — round-trippable, ~27% fewer tokens than JSON. Drop it for JSON output; agents using `@gortex/wire` or the Go `github.com/gortexhq/gcx-go` package decode either._

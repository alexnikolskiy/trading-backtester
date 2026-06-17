# Slice 6b-A — Sandboxed Overlay-Module Execution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lift trading-platform's per-bar-IPC sandboxed `ModuleExecutor` into trading-backtester as the UNTRUSTED overlay execution path (sibling to the 6a trusted in-process executor), so `engine:'overlay'` runs submitted bundles in a locked-down Docker session and produces a `RunOutcome` byte-identical to the trusted run (same goldens `0be9931c`/`e381659c`).

**Architecture:** New subtree `apps/backtester/src/engine/sandbox/**` (kept separate from the Slice-3 signals sandbox `src/sandbox/**` — no dedup) binds the 6a engine's `ModuleExecutor`/`ExecutorRouter` seam. The worker routes `engine:'overlay'` to the sandbox executor when a `moduleBundle` is present (explicit), else to the trusted registry (6a). Untrusted hooks run per-bar in a session container; sizing/risk/exec/metrics stay in-process — identical to the trusted path except the decision source. Determinism/parity reuses `src/determinism/*` and the single-source indicator engine `src/engine/indicators` (compiled into the harness `_engine/`).

**Tech Stack:** TypeScript (ESM, `.js` specifiers), pnpm, vitest, Docker (sandbox; tests Docker-gated → skip-not-fail), ajv (017 validation, 6a), Node 24 (raw-fd sync IPC). Lift source: `trading-platform/src/research/sandbox/**` + `src/research/sandbox-harness/**` + `scripts/verify_020_equivalence.mjs` + `specs/019-sandbox-module-gateway/fixtures/bundles/**`.

**Reference:** `docs/superpowers/specs/2026-06-17-slice-6b-a-sandbox-overlay-executor-design.md`. Builds on Slice 6a (PR #5).

---

## Preconditions & conventions

- **Execute only after PR #5 (`feat/slice-6a-runner-lift`) is merged to `main`** and this branch is rebased onto `main`, so `apps/backtester/src/engine/**` (runner, indicators, validation, sandbox-policy, run-overlay, module-executor, registry, artifacts) and the 6a goldens/fixtures exist. Task 0 enforces this.
- **Two sandboxes stay separate (load-bearing invariant):** do NOT edit, merge, or share code between `apps/backtester/src/sandbox/**` (Slice-3 signals) and the new `apps/backtester/src/engine/sandbox/**` (overlay). Only `src/determinism/*` + `@trading/research-contracts` are shared.
- **Do NOT touch** `src/runner/**`, `src/sandbox/**`, `src/determinism/**`, or the engine core under `src/engine/**` except where a task explicitly says so. The momentum golden `sha256:eff10116147933c96d92ae50071ef66339467fb69545c38855dcd50c2c0b43ba` and the standalone `momentum-guardrail.test.ts` must stay green after every task.
- **Goldens are FROZEN — debug, don't re-freeze.** The sandboxed overlay path must reproduce `sha256:0be9931c…` (baseline) / `sha256:e381659c…` (variant). If a hash diverges, it's a parity bug to fix in the lift, never by editing the golden.
- Gortex MCP hooks deny `Read`/`Grep`/`Glob` on indexed source — use gortex tools; `Write` for new files, `edit_file` for edits, `Bash cp`/`diff`/`docker` for files/Docker. Tests from repo ROOT: `pnpm vitest run test/<file>.test.ts`, `pnpm typecheck`, `pnpm test`. (`pnpm --filter … test` is a no-op.)
- Docker-gated tests gate on `dockerAvailable()` and **skip** (never fail) when no daemon — mirror `apps/backtester/test/sandbox.test.ts`.
- Platform reference (read-only): `/home/alexxxnikolskiy/projects/trading-platform`. The `verify_018` gate tooling is on its branch `004-sdk-ops-read-surface` (pushed).

## File structure (created / modified)

**New subtree `apps/backtester/src/engine/sandbox/`** (lifted): `docker-driver.ts`, `ipc.ts`, `sandbox-session.ts`, `sandbox-executor.ts`, `decision-revalidator.ts`, `routing.ts`, `acceptance-gate.ts`, `context-serializer.ts`, `bundle.ts`, `bundle-hash.ts`, `errors.ts`, `redaction.ts`, plus NEW `bundle-materialize.ts`.

**New harness `apps/backtester/sandbox-harness-overlay/`**: `entry.mjs`, `rehydrate.mjs`, `deny-shims.mjs`, `_engine/` (built), + a build script.

**Modified:** `apps/backtester/src/engine/run-overlay.ts` (+`router?`), `apps/backtester/src/jobs/worker.ts` (overlay→sandbox branch), `apps/backtester/src/config.ts` (overlay sandbox settings + image digest), `apps/backtester/src/jobs/submit.ts` (6a minor), `apps/backtester/src/engine/data-adapter.ts` (6a minor), `packages/research-contracts/src/research/module.ts` (additive `ModuleKind`+='overlay' / hooks fields if needed), `package.json` (harness build script).

**New tests:** `overlay-sandbox-acceptance.test.ts`, `overlay-sandbox-materialize.test.ts`, `overlay-sandbox-session.test.ts` (Docker-gated), `overlay-sandbox-equivalence.test.ts` (Docker-gated, the make-or-break), `harness-engine-drift.test.ts`, `overlay-router.test.ts`.

**New fixtures:** `apps/backtester/test/fixtures/overlay/bundles/{short-after-pump,early-exit-short-after-pump}/` (lifted hooks bundles, backtester inline form).

**Platform repo (separate commit on `004-sdk-ops-read-surface`):** extend `scripts/verify_018_overlay_variant.mjs` (+ helper) with a bundle-submitting HTTP case.

---

## Task 0: Precondition, branch, baseline

**Files:** none (git only).

- [ ] **Step 1: Confirm 6a is merged + present**

Run: `git -C /home/alexxxnikolskiy/projects/trading-backtester log --oneline -1 origin/main | cat` and confirm 6a is merged (PR #5). Then create/rebase the work branch:
`git checkout main && git pull && git checkout -b feat/slice-6b-a-sandbox-overlay` (or rebase the existing design branch onto main).
Verify `apps/backtester/src/engine/run-overlay.ts`, `src/engine/module-executor.ts`, `src/engine/indicators/`, `src/engine/sandbox-policy.ts`, `test/fixtures/overlay/goldens/{baseline,variant}.hash` all exist (gortex `read_file`/`search_symbols`).

- [ ] **Step 2: Baseline green**

Run: `pnpm install && pnpm typecheck && pnpm test`
Expected: PASS. Confirm momentum `eff10116…` + overlay `0be9931c`/`e381659c` goldens green, 0 failures (Docker/Pg-gated may skip).

- [ ] **Step 3: Record the two goldens for later assertions**

Run: `cat apps/backtester/test/fixtures/overlay/goldens/baseline.hash apps/backtester/test/fixtures/overlay/goldens/variant.hash`
Expected: `sha256:0be9931c…` and `sha256:e381659c…`. (These stay frozen.)

---

## Task 1: Fold in the two 6a minors (early)

**Files:**
- Modify: `apps/backtester/src/jobs/submit.ts`, `apps/backtester/src/engine/data-adapter.ts`
- Test: `apps/backtester/test/overlay-gating.test.ts` (extend), `apps/backtester/test/overlay-engine.test.ts` (extend)

- [ ] **Step 1: Write a failing test asserting gate-before-validate message precision**

In `overlay-gating.test.ts`, add a test that submits an `engine:'overlay'` request with an overlay-only metric (e.g. `metrics:['sharpe']`) while `enableOverlayEngine:false`, and asserts the rejection message is the engine-disabled one, not `unknown_metric`:
```ts
it('overlay request while disabled reports engine-disabled (not unknown_metric) regardless of metrics', async () => {
  const app = await buildTestApp({ enableOverlayEngine: false });
  const res = await app.inject({ method:'POST', url:'/v1/runs',
    headers:{ authorization:'Bearer test-token', 'content-type':'application/json' },
    payload: { ...runBody(), engine:'overlay', metrics:['sharpe'] } });
  expect(res.statusCode).toBe(400);
  expect(res.json().code).toBe('validation_error');
  expect(res.json().message).toMatch(/overlay engine is disabled/i);
});
```
(Match the real `AUTH`/`runBody` helpers + error field from `api.e2e.test.ts`.)

- [ ] **Step 2: Run → FAIL** (`pnpm vitest run test/overlay-gating.test.ts`) — today the metric-catalog check in `validate(body)` runs first → `unknown_metric`.

- [ ] **Step 3: Move the gate before validate**

In `submit.ts` `submitRun`, move the `if (body.engine === 'overlay' && !deps.enableOverlayEngine) throw new SubmitError(400, 'validation_error', 'overlay engine is disabled')` block to BEFORE `validate(body)`.

- [ ] **Step 4: NaN-guard → RunnerError**

In `data-adapter.ts`, change the `Date.parse` NaN guard to throw `new RunnerError('validation_error', 'invalid period: <from>/<to>')` instead of a bare `Error`. Import `RunnerError` from `../runner/errors.js` (confirm path/constructor via gortex; it's the same `RunnerError` the worker maps). Add/extend a test in `overlay-engine.test.ts` asserting `buildOverlayDataset` with a malformed period rejects with a `RunnerError` whose code is `validation_error`.

- [ ] **Step 5: Run → PASS + golden guard**

Run: `pnpm vitest run test/overlay-gating.test.ts test/overlay-engine.test.ts test/determinism.test.ts test/momentum-guardrail.test.ts` → green; `eff10116…` unchanged. `pnpm typecheck` clean.

- [ ] **Step 6: Commit**

```bash
git add apps/backtester/src/jobs/submit.ts apps/backtester/src/engine/data-adapter.ts apps/backtester/test/
git commit -m "fix(slice-6b-a): gate overlay before validate() + data-adapter NaN guard → RunnerError(validation_error)"
```

---

## Task 2: Lift the example hooks-bundle fixtures (§11 open item: path + shape)

**Files:**
- Create: `apps/backtester/test/fixtures/overlay/bundles/short-after-pump/` and `…/early-exit-short-after-pump/`
- Reference: `trading-platform/specs/019-sandbox-module-gateway/fixtures/bundles/{strategy-short-after-pump,overlay-early-exit}/`

- [ ] **Step 1: Inspect the platform bundle fixtures**

Read (gortex `read_file`) the platform fixtures' `manifest.json` + `module/index.js` for both bundles. Confirm: `short_after_pump` (kind `strategy`, `hooks:['onBarClose']`, id@version = `short_after_pump@0.1.0`), `early_exit_short_after_pump` (kind `overlay`, `hooks:['apply']`, `interceptionPoint:'post_entry_management'`, `targetStrategyRef:'short_after_pump'`). The `module/index.js` default-exports a hook factory using only the rehydrated read-only context (no repo/dist imports). **The id@version MUST match the 6a trusted modules** so `evidence.moduleVersions` is unchanged.

- [ ] **Step 2: Convert to the backtester inline `ModuleBundle` form**

For each, produce a JSON file `apps/backtester/test/fixtures/overlay/bundles/<name>.bundle.json` matching the backtester's inline `ModuleBundle` `{ manifest, entry, files }` — where `manifest` is the 017 `ModuleManifest` (from the platform `manifest.json`, with `bundleContractVersion` set to the backtester's `BUNDLE_CONTRACT_VERSION`), `entry` is the module entry path (e.g. `module/index.js`), and `files` is `{ "module/index.js": "<verbatim source>" }`. Keep the module source byte-identical to the platform's (parity). Document any field added for the backtester form.

- [ ] **Step 3: Sanity test the fixtures parse + content-address**

Add `apps/backtester/test/overlay-sandbox-acceptance.test.ts` (first test): load each `*.bundle.json`, assert it parses, `manifest.id`/`manifest.hooks` are present, and `bundleHash(bundle)` (from the Slice-3 `src/sandbox/bundle.ts` `bundleHash` = `contentRef`) is a stable `sha256:` (call twice, equal). Run → PASS. `pnpm typecheck` clean.

- [ ] **Step 4: Commit**

```bash
git add apps/backtester/test/fixtures/overlay/bundles apps/backtester/test/overlay-sandbox-acceptance.test.ts
git commit -m "test(slice-6b-a): lift short_after_pump + early_exit hooks-bundle fixtures (backtester inline form)"
```

---

## Task 3: Extend `runOverlayBacktest` with optional `router?` (the §4.4 correction)

**Files:**
- Modify: `apps/backtester/src/engine/run-overlay.ts`
- Test: `apps/backtester/test/overlay-router.test.ts`

- [ ] **Step 1: Write the byte-identity + forwarding test**

Create `overlay-router.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { runOverlayBacktest } from '../src/engine/run-overlay.js';
import { buildTrustedRegistry } from '../src/engine/trusted-registry.js';
import { buildOverlayDataset } from '../src/engine/data-adapter.js';
import { FixtureDataPort } from '../src/data/reader.js';
import { contentRef } from '../src/determinism/hash.js';
import { FIXTURES_DIR } from './helpers.js'; // or inline as momentum-guardrail does, if helpers pulls heavy deps
import { readFileSync } from 'node:fs';

const GV = readFileSync(new URL('./fixtures/overlay/goldens/variant.hash', import.meta.url),'utf8').trim();
const variantReq = JSON.parse(readFileSync(new URL('./fixtures/overlay/requests/variant.json', import.meta.url),'utf8'));

it('runOverlayBacktest with no router is byte-identical to 6a (variant golden)', async () => {
  const registry = buildTrustedRegistry();
  const marketTape = await buildOverlayDataset(new FixtureDataPort(FIXTURES_DIR), {
    datasetRef: variantReq.datasetRef, symbols: variantReq.symbols, timeframe: variantReq.timeframe, period: variantReq.period });
  const out = runOverlayBacktest(variantReq, { registry, marketTape }); // NO router → trusted path
  expect(contentRef(out)).toBe(GV);
});
```

- [ ] **Step 2: Run → PASS already** (`pnpm vitest run test/overlay-router.test.ts`) — this pins the pre-change behavior. (If `FIXTURES_DIR` from `./helpers` pulls engine/app code that's fine here.)

- [ ] **Step 3: Add the optional `router?` additively**

In `run-overlay.ts`, change `OverlayRunDeps` to add `readonly router?: ExecutorRouter;` (import `ExecutorRouter` from `./module-executor.js`), and forward it:
```ts
export function runOverlayBacktest(request: BacktestRunRequest, deps: OverlayRunDeps): RunOutcome {
  const { engine: _engine, ...engineRequest } = request;
  return runBacktest(engineRequest, {
    registry: deps.registry,
    ...(deps.marketTape ? { marketTape: deps.marketTape } : {}),
    ...(deps.router ? { router: deps.router } : {}),
  });
}
```
(Confirm `runBacktest`'s `RunDeps` accepts `router` — it does, lifted in 6a: `deps.router ?? createTrustedRouter(deps.executor)`. Keep the `engine`-strip and the existing marketTape handling.)

- [ ] **Step 4: Run → PASS** (`pnpm vitest run test/overlay-router.test.ts`) — the no-router byte-identity test still hits `GV`. `pnpm typecheck` clean. Run the 6a overlay-golden + e2e suites → unchanged green.

- [ ] **Step 5: Commit**

```bash
git add apps/backtester/src/engine/run-overlay.ts apps/backtester/test/overlay-router.test.ts
git commit -m "feat(slice-6b-a): runOverlayBacktest accepts optional router? (additive); no-router path byte-identical to 6a"
```

---

## Task 4: Lift the sandbox subsystem → `src/engine/sandbox/**`

**Files:**
- Create: `apps/backtester/src/engine/sandbox/{docker-driver,ipc,sandbox-session,sandbox-executor,decision-revalidator,routing,acceptance-gate,context-serializer,bundle,bundle-hash,errors,redaction}.ts`
- Reference: `trading-platform/src/research/sandbox/*.ts`

- [ ] **Step 1: Copy the 12 files**

`cp` each from `trading-platform/src/research/sandbox/<name>.ts` to `apps/backtester/src/engine/sandbox/<name>.ts`. Confirm with `ls`.

- [ ] **Step 2: Rewrite imports (import-specifier ONLY — no logic edits, parity)**

Per file, rewrite:
- `../../contracts/research/<x>.js` → `@trading/research-contracts/research`
- `../backtest/module-executor.js` → `../module-executor.js`; `../backtest/registry.js` → `../registry.js`; `../backtest/artifacts.js` → `../artifacts.js`
- `../validation/<x>.js` → `../validation/<x>.js` (6a path under `src/engine/validation`)
- `./sandbox-policy.js` (if any references the policy in this dir) → `../sandbox-policy.js` (6a lifted it to `src/engine/sandbox-policy.ts`); if the platform kept sandbox-policy IN the sandbox dir, instead delete the duplicate and import from `../sandbox-policy.js`
- canonical/rng → `../../determinism/{canonical-json,rng}.js`; hash/contentRef → `../../determinism/hash.js`
- node builtins unchanged.
If any file imports something OUTSIDE {the lifted set, `@trading/research-contracts/research`, `src/engine/*` (module-executor/registry/artifacts/validation/sandbox-policy), `src/determinism/*`, node builtins} → STOP and report (a new missing dependency — likely a contract type to add, like the 6a CP2 hard-stop).

- [ ] **Step 3: HARD STOP check — determinism reuse**

Confirm the lifted files use `../../determinism/{rng,canonical-json}` and introduce NO `Math.random`/`Date.now`/second PRNG (grep the new dir). The session container name must be deterministic (`sessionContainerName` uses no wall-clock/random — confirm; it's part of the input tuple). If anything would require a behavioral change to determinism, STOP and report.

- [ ] **Step 4: Typecheck**

Run: `pnpm typecheck` → CLEAN. Iterate import paths until clean. A non-import type error (genuine missing symbol) is a HARD STOP → report it.

- [ ] **Step 5: Commit**

```bash
git add apps/backtester/src/engine/sandbox
git commit -m "feat(slice-6b-a): lift platform sandbox subsystem into src/engine/sandbox (import-rewrite only)"
```

---

## Task 5: Sandbox config — overlay session settings + pinned image digest (§11 open item)

**Files:**
- Modify: `apps/backtester/src/config.ts`, `apps/backtester/src/engine/sandbox/sandbox-policy.ts` (or `src/engine/sandbox-policy.ts`)
- Test: `apps/backtester/test/overlay-sandbox-acceptance.test.ts` (extend) / a config test

- [ ] **Step 1: Determine the pinned overlay image**

Read the lifted `sandbox-policy.ts` `SANDBOX_IMAGE` (a pinned `node:…@sha256:…` digest) and the platform `infra/sandbox/Dockerfile.sandbox` (gortex `read_file`). The harness `_engine/` is compiled JS + needs Node 24; the pinned digest must be an image with Node 24 (the lifted default). Record the digest the backtester will pin (reuse the lifted `SANDBOX_IMAGE` digest unless the backtester needs a different base — if so, document why and pin a digest, never a floating tag).

- [ ] **Step 2: Add overlay sandbox settings to config**

In `config.ts`, add an `overlaySandbox` block to `AppConfig` + `loadConfig` (mirror the existing `sandbox: SandboxSettings` style) with: `harnessDir` (default `resolve(HERE,'../sandbox-harness-overlay')`), `image` (the pinned digest), per-call + per-session `wallTimeMs`, memory/cpus/pids/tmpfs, and per-message byte caps — defaulting to the lifted `DEFAULT_SANDBOX` policy values. Env: `BACKTESTER_SANDBOX_OVERLAY_*`. Do NOT touch the Slice-3 `sandbox`/`BACKTESTER_SANDBOX_*` block.

- [ ] **Step 3: Config test**

Add a test asserting `loadConfig({}).overlaySandbox.image` equals the pinned digest and the wall-time defaults match the lifted policy. Run → PASS. `pnpm typecheck` clean.

- [ ] **Step 4: Commit**

```bash
git add apps/backtester/src/config.ts apps/backtester/src/engine/sandbox apps/backtester/test/
git commit -m "feat(slice-6b-a): overlay sandbox config + pinned image digest"
```

---

## Task 6: Harness lift + `_engine` build + drift-guard (§11 open item: drift mechanism)

**Files:**
- Create: `apps/backtester/sandbox-harness-overlay/{entry,rehydrate,deny-shims}.mjs`, a build script `apps/backtester/scripts/build-sandbox-harness-overlay.mjs` (or a package.json script), generated `apps/backtester/sandbox-harness-overlay/_engine/**`
- Reference: `trading-platform/src/research/sandbox-harness/*`
- Modify: `package.json` (build script), Test: `apps/backtester/test/harness-engine-drift.test.ts`

- [ ] **Step 1: Lift the hand-authored harness files**

`cp` `entry.mjs`, `rehydrate.mjs`, `deny-shims.mjs` from `trading-platform/src/research/sandbox-harness/` into `apps/backtester/sandbox-harness-overlay/`. Rewrite any relative import to the local harness siblings/`_engine`. Keep them self-contained (only `./` harness imports + node builtins).

- [ ] **Step 2: Build `_engine` from the single source `src/engine/indicators`**

Write `build-sandbox-harness-overlay.mjs`: compile `apps/backtester/src/engine/indicators/**` (+ the `rng` + context-rehydrate deps the harness imports — confirm the exact set the platform `_engine` contains) to plain ESM JS into `apps/backtester/sandbox-harness-overlay/_engine/`, AND write a manifest `apps/backtester/sandbox-harness-overlay/_engine/.build-manifest.json` = `{ sourceHash: contentRef(<sorted map of src/engine/indicators file paths→contents + the rng/rehydrate deps>) }`. Add `"build:sandbox-harness-overlay": "node apps/backtester/scripts/build-sandbox-harness-overlay.mjs"` to `package.json` and wire it into the build/pretest pipeline so `_engine` is regenerated before tests. Run it; confirm `_engine/` populated.

- [ ] **Step 3: Drift-guard test (single source of truth)**

Create `harness-engine-drift.test.ts`: recompute `contentRef` over the SAME source set the build hashes, and assert it equals `_engine/.build-manifest.json.sourceHash` — so a stale or hand-edited `_engine` (drift from `src/engine/indicators`) FAILS:
```ts
it('harness _engine is built from src/engine/indicators (no drift)', () => {
  const expected = computeIndicatorSourceHash(); // sorted-map contentRef over src/engine/indicators (+ deps), same fn the build uses
  const manifest = JSON.parse(readFileSync(new URL('../../sandbox-harness-overlay/_engine/.build-manifest.json', import.meta.url),'utf8'));
  expect(manifest.sourceHash).toBe(expected);
});
```
(Factor `computeIndicatorSourceHash` into a shared module used by both the build script and the test — one definition.) Run → PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/backtester/sandbox-harness-overlay apps/backtester/scripts/build-sandbox-harness-overlay.mjs apps/backtester/test/harness-engine-drift.test.ts package.json
git commit -m "feat(slice-6b-a): overlay sandbox harness + _engine built from src/engine/indicators + drift-guard"
```

---

## Task 7: Bundle materialization + acceptance-gate + hooks-manifest reconciliation

**Files:**
- Create: `apps/backtester/src/engine/sandbox/bundle-materialize.ts`
- Modify: `packages/research-contracts/src/research/module.ts` (additive, if needed)
- Test: `apps/backtester/test/overlay-sandbox-materialize.test.ts`, `overlay-sandbox-acceptance.test.ts` (extend)

- [ ] **Step 1: Additive hooks-manifest reconciliation**

Confirm the lifted `acceptance-gate.ts` + `sandbox-executor` consume the 017 `ModuleManifest` (with `hooks`, `kind`, `interceptionPoint`, `targetStrategyRef`) from `@trading/research-contracts/research`. If `ModuleKind` there lacks `'overlay'` or the manifest lacks a hooks field needed by the lifted code, add it ADDITIVELY (optional fields; `ModuleKind` union += `'overlay'`) — purely on the `/research` side; do NOT change the root wire `ModuleManifest` or break the 6a contract tests. Typecheck clean.

- [ ] **Step 2: Write the materialization test**

Create `overlay-sandbox-materialize.test.ts`:
```ts
import { materializeBundle } from '../src/engine/sandbox/bundle-materialize.js';
it('materializes an inline ModuleBundle to a temp bundleDir (manifest.json + bundle.json + module/)', async () => {
  const bundle = loadInlineBundle('short-after-pump'); // read the *.bundle.json fixture
  const { bundleDir, cleanup } = await materializeBundle(bundle);
  expect(existsSync(join(bundleDir, 'manifest.json'))).toBe(true);
  expect(existsSync(join(bundleDir, 'bundle.json'))).toBe(true);
  expect(existsSync(join(bundleDir, bundle.entry))).toBe(true);
  await cleanup();
  expect(existsSync(bundleDir)).toBe(false);
});
```

- [ ] **Step 3: Run → FAIL** (materializeBundle undefined).

- [ ] **Step 4: Implement `materializeBundle`**

`bundle-materialize.ts`: write `bundle.files` to a unique temp dir (`fs.mkdtemp`), write `manifest.json` (the 017 manifest) + `bundle.json` (the `BundleDescriptor`: contractVersion, kind, entryPoint, files [{path,sha256}], bundleHash — recomputed to match the lifted `acceptance-gate`/`bundle-hash` expectation), return `{ bundleDir, cleanup }`. Signature:
```ts
export interface MaterializedBundle { readonly bundleDir: string; cleanup(): Promise<void>; }
export async function materializeBundle(bundle: ModuleBundle): Promise<MaterializedBundle>
```
Confirm the produced `bundleDir` shape is exactly what the lifted `loadBundle(bundleDir)` + `acceptance-gate` expect (read those; the descriptor fields must line up).

- [ ] **Step 5: Acceptance-gate test**

In `overlay-sandbox-acceptance.test.ts`, materialize the fixture, `loadBundle(bundleDir)`, then `validateBundle(loaded, platformContractContext([manifest.id]))` (the lifted acceptance-gate + the 6a `platformContractContext`), assert `status==='accepted'` and the recomputed `bundleHash` matches. Add a negative case: a tampered file → `validateBundle` rejects with an integrity issue.

- [ ] **Step 6: Run → PASS** both files; `pnpm typecheck` clean; 6a contract tests still green.

- [ ] **Step 7: Commit**

```bash
git add apps/backtester/src/engine/sandbox/bundle-materialize.ts packages/research-contracts apps/backtester/test/
git commit -m "feat(slice-6b-a): bundle materialization (inline → temp bundleDir) + 017 acceptance-gate + additive hooks-manifest"
```

---

## Task 8: Session IPC round-trip (Docker-gated)

**Files:**
- Test: `apps/backtester/test/overlay-sandbox-session.test.ts` (Docker-gated)

- [ ] **Step 1: Write the Docker-gated session test**

Create `overlay-sandbox-session.test.ts` mirroring `sandbox.test.ts`'s Docker gating (`describe.skipIf(!available)` using `dockerAvailable()` from the lifted `docker-driver` or the Slice-3 `src/sandbox/docker.ts` — use the lifted one):
```ts
// gate on dockerAvailable(); pull the pinned image in beforeAll if needed
it('opens a session container, runs init + one onBarClose hook, returns decisions, tears down', async () => {
  const bundle = loadInlineBundle('short-after-pump');
  const { bundleDir, cleanup } = await materializeBundle(bundle);
  const executor = new SandboxModuleExecutor(loadBundle(bundleDir), DEFAULT_OVERLAY_POLICY, { harnessDir: OVERLAY_HARNESS_DIR });
  const ctx = makeMinimalStrategyContext(/* symbol BTCUSDT, one bar */);
  executor.initStrategy(strategyModuleStub, ctx);
  const decisions = executor.executeStrategyHook(strategyModuleStub, 'onBarClose', ctx);
  expect(Array.isArray(decisions)).toBe(true); // a valid 017 decision array (idle/enter), revalidated
  executor.close();
  await cleanup();
});
```
Build `makeMinimalStrategyContext` from the 6a engine context shape (read `src/engine/context.ts`/`@trading/research-contracts/research` `StrategyContext`). The point is to exercise the REAL DockerDriver + SyncIpcChannel + harness over a real container for one hook — not full parity (that's Task 10).

- [ ] **Step 2: Run (Docker present) → PASS; (no Docker) → SKIP**

Run: `pnpm vitest run test/overlay-sandbox-session.test.ts`. If Docker present, ensure the pinned image is pulled. If it FAILS on a real container, debug the driver/IPC/harness wiring (raw-fd framing, harness `_engine` resolution, mount paths). `pnpm typecheck` clean.

- [ ] **Step 3: Commit**

```bash
git add apps/backtester/test/overlay-sandbox-session.test.ts
git commit -m "test(slice-6b-a): Docker-gated session IPC round-trip (init + onBarClose over a real container)"
```

---

## Task 9: Wire the worker overlay→sandbox branch

**Files:**
- Modify: `apps/backtester/src/jobs/worker.ts`
- Test: `apps/backtester/test/overlay-sandbox-equivalence.test.ts` (created here, Docker-gated; parity assertions added in Task 10)

- [ ] **Step 1: Implement the bundle-present branch**

In the worker's `engine:'overlay'` branch (6a), branch on `job.bundleHash`:
- **present** → `bundle = await deps.bundleStore.get(job.bundleHash)` (else `RunnerError('missing_module')`); `{bundleDir, cleanup} = await materializeBundle(bundle)`; build `registry = createModuleRegistry({ strategyBundles | overlayBundles: [loadBundle(bundleDir)], riskProfiles:[DEFAULT_RISK], executionProfiles:[DEFAULT_EXEC], sandboxPolicies:[DEFAULT_OVERLAY_POLICY] })` and `router = createExecutorRouter({ sandboxPolicies: registry /* or the policy registry */ })` (match the lifted `verify_020` construction pattern exactly — read it); `runOverlayBacktest(engineRequest, { registry, router, marketTape })`; in `finally` `await cleanup()`. After the run, if `router.errors()` is non-empty surface them (artifact / terminal code). `resultHash = contentRef(outcome)`.
- **absent** → trusted (6a, unchanged).
Keep the momentum `else` branch byte-identical. Confirm `WorkerDeps` exposes `bundleStore` (Slice-3 does) + the overlay sandbox config; thread the harness dir + policy from `config.overlaySandbox`.

NOTE: a request reaching the overlay+bundle branch needs `engine:'overlay'` AND a submitted `moduleBundle` whose manifest declares hooks. Confirm `submitRun` stores `bundleHash` for overlay submissions the same way it does for signals (it does — bundle-store.put + bundleHash on the job).

- [ ] **Step 2: Smoke (non-Docker) typecheck + 6a regression**

`pnpm typecheck` clean. Run the 6a trusted overlay e2e + goldens → unchanged green (the trusted/no-bundle path is untouched).

- [ ] **Step 3: Commit**

```bash
git add apps/backtester/src/jobs/worker.ts
git commit -m "feat(slice-6b-a): worker routes engine:'overlay' + bundle → sandbox executor (createExecutorRouter); trusted path unchanged"
```

---

## Task 10: PARITY GATE — sandbox-equivalence (make-or-break, Docker-gated)

**Files:**
- Test: `apps/backtester/test/overlay-sandbox-equivalence.test.ts`

- [ ] **Step 1: Write the equivalence test (frozen goldens, debug-don't-refreeze)**

In `overlay-sandbox-equivalence.test.ts` (Docker-gated):
```ts
const GB = readFileSync(new URL('./fixtures/overlay/goldens/baseline.hash', import.meta.url),'utf8').trim();
const GV = readFileSync(new URL('./fixtures/overlay/goldens/variant.hash', import.meta.url),'utf8').trim();

it('SANDBOXED overlay run is byte-identical to trusted (variant) — hits the platform golden', async () => {
  // trusted (no bundle): 6a path
  const trustedOut = runOverlayBacktest(variantReq, { registry: buildTrustedRegistry(), marketTape });
  // sandbox (bundle): materialize the SAME modules as hooks bundles + createExecutorRouter
  const sbRegistry = createModuleRegistry({ strategyBundles:[loadBundle(spDir)], overlayBundles:[loadBundle(eeDir)], riskProfiles:[DEFAULT_RISK], executionProfiles:[DEFAULT_EXEC], sandboxPolicies:[DEFAULT_OVERLAY_POLICY] });
  const router = createExecutorRouter({ sandboxPolicies: sbRegistry });
  const sandboxOut = runOverlayBacktest(variantReq, { registry: sbRegistry, router, marketTape });
  expect(router.errors()).toEqual([]);
  router.closeAll();
  expect(contentRef(sandboxOut)).toBe(contentRef(trustedOut));
  expect(contentRef(sandboxOut)).toBe(GV);
});
it('SANDBOXED baseline (no overlay bundle) hits the baseline golden', async () => { /* same, baselineReq, expect GB */ });
it('sandbox run is byte-identical on replay', async () => { /* run twice, contentRef equal */ });
```
Match the lifted `createModuleRegistry`/`createExecutorRouter` API exactly (read `routing.ts`). Materialize both hooks bundles to dirs (`spDir`/`eeDir`) in `beforeAll`; clean up in `afterAll`.

- [ ] **Step 2: Run (Docker) — iterate to byte-identity; DO NOT edit the goldens**

Run: `pnpm vitest run test/overlay-sandbox-equivalence.test.ts`. The sandboxed `contentRef` MUST equal the trusted one AND the frozen golden. If it diverges: diff `canonicalJson(sandboxOut)` vs `canonicalJson(trustedOut)`, find the first divergent char (the verify_018_determinism technique), and fix the cause in the lift — likely culprits: harness `_engine` not the identical indicator code path (drift-guard should catch), context-serializer/rehydrate dropping/reordering a field, the bundle module source not byte-matching the trusted module's logic, a revalidator difference, or `runId`/manifest-version mismatch in `evidence.moduleVersions`. **Never edit `*.hash`.** If unresolved, STOP and report BLOCKED with the first-divergence.

- [ ] **Step 3: Commit**

```bash
git add apps/backtester/test/overlay-sandbox-equivalence.test.ts
git commit -m "test(slice-6b-a): sandbox-equivalence parity gate — sandboxed RunOutcome === trusted === platform goldens"
```

---

## Task 11: Extend the verify_018 HTTP gate with a bundle submission (cross-repo, platform)

**Files (in `trading-platform`, branch `004-sdk-ops-read-surface`):**
- Modify: `scripts/verify_018_overlay_variant.mjs` (+ the `scripts/lib/verify_018_http_target.mjs` helper)

- [ ] **Step 1: Add a bundle-submitting HTTP case**

In `verify_018_overlay_variant.mjs`'s `VERIFY_018_TARGET === 'http'` block, add a second submission that posts the variant request with `engine:'overlay'` AND a `moduleBundle` (the hooks bundle for `short_after_pump`+`early_exit`, in the backtester wire `ModuleBundle` form — read the lifted bundle fixtures), and assert the returned `result.resultHash === 'sha256:e381659c…'` (the same golden the trusted submission asserts). Extend `runViaHttp` (or add `runBundleViaHttp`) to include `moduleBundle` in the body. The expected hash is the platform in-process `contentRef` (unchanged) — the bundle path must match it.

- [ ] **Step 2: Run live (Docker on the service host)**

Boot the backtester service `BACKTESTER_ENABLE_OVERLAY_ENGINE=true pnpm start` (overlay sandbox needs Docker + the pinned image pulled). Run `VERIFY_018_TARGET=http … node scripts/verify_018_overlay_variant.mjs` → OK, both the trusted-ref and the bundle submissions assert `e381659c`. Kill the service. If no Docker on the host, the bundle case must be guarded to skip (not fail) — mirror the in-repo Docker gating.

- [ ] **Step 3: Commit (platform repo, separate commit)**

```bash
cd /home/alexxxnikolskiy/projects/trading-platform
git add scripts/verify_018_overlay_variant.mjs scripts/lib/verify_018_http_target.mjs
git commit -m "test(018): verify_018_overlay_variant HTTP gate also submits a sandboxed bundle (engine:overlay + moduleBundle) — result_hash === e381659c"
```

---

## Task 12: Docs + final regression

**Files:** Modify `README.md`, `docs/ARCHITECTURE.md`.

- [ ] **Step 1: README "Slice 6b-A" section**

Add a Slice 6b-A entry: untrusted overlay bundles run per-bar in a session Docker sandbox (`src/engine/sandbox/**`, separate from the Slice-3 signals sandbox), selected within `engine:'overlay'` by bundle presence; the sandboxed `RunOutcome` is byte-identical to trusted (same goldens `0be9931c`/`e381659c`), proven by the Docker-gated equivalence test + the verify_018 HTTP bundle gate; `enableOverlayEngine` still gates (default off); sync-IPC blocks the event loop (documented limitation, worker concurrency 1, isolation deferred); `BACKTESTER_SANDBOX_OVERLAY_*` config + pinned image. Note 6b-B (trading-lab cutover) + 6b-C (sp4_mock retire) remain.

- [ ] **Step 2: ARCHITECTURE note** — one bullet that 6b-A landed (untrusted sandboxed overlay execution; equivalence gate); 6b-B/6b-C pending.

- [ ] **Step 3: Final full regression**

Run: `pnpm typecheck && pnpm test` → green. Momentum `eff10116…` unchanged; overlay goldens `0be9931c`/`e381659c` green via BOTH trusted (6a) and the sandbox-equivalence test (Docker-gated); 6a suites unchanged. Report pass/skip counts.

- [ ] **Step 4: Commit**

```bash
git add README.md docs/ARCHITECTURE.md
git commit -m "docs(slice-6b-a): document sandboxed overlay execution + equivalence gate + overlay sandbox config"
```

---

## Self-review

**Spec coverage:** §3.1 two-sandbox separation → Task 4 (new subtree) + the no-touch convention. §4.1 lift → Task 4. §4.2 harness build + drift-guard → Task 6. §4.3 bundle materialize + acceptance-gate + additive manifest → Tasks 2,7. §4.4 runOverlayBacktest router? (the correction) → Task 3; worker selection → Task 9. §5 parity dual-layer (same goldens) → Task 10 (in-repo equivalence) + Task 11 (HTTP bundle gate). §6 error taxonomy → carried by the lift (Task 4) + surfaced in Task 9. §7 blocking IPC → documented (Task 12). §8.1 the two 6a minors → Task 1. §11 open items → Task 2 (fixture path+shape), Task 6 (drift-guard mechanism), Task 5 (pinned image digest). Sandbox config → Task 5. Every spec section maps to a task.

**Placeholder scan:** code/commands are concrete; where an exact symbol/API can only be confirmed against the lifted 6a/platform code (e.g. `createModuleRegistry`/`createExecutorRouter` arg shapes, `StrategyContext` construction, the harness `_engine` dep set), the task says "read/confirm via gortex" and names the file — not a silent TBD. The verbatim-lift tasks specify source paths + exact import-rewrite rules + verify gates.

**Type consistency:** `runOverlayBacktest({registry, router?, marketTape})`, `OverlayRunDeps`, `ExecutorRouter`, `createModuleRegistry`/`createExecutorRouter`, `materializeBundle → {bundleDir, cleanup}`, `SandboxModuleExecutor`, `loadBundle`, `validateBundle` (acceptance-gate), `contentRef`, goldens `0be9931c`/`e381659c`, `enableOverlayEngine`, `config.overlaySandbox` are used consistently across Tasks 3–12.

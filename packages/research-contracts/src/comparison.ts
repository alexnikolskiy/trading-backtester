// Wire comparison vocabulary (baseline-vs-variant). Structurally mirrors
// apps/backtester/src/engine/artifacts.ts ComparisonSummary; the overlay-summary projection assigns
// the engine value to this type (the assignment is the compile-time drift guard). Optional on
// RunResultSummary — momentum summaries omit it.

import type { Ref } from './run.js';

export interface MetricDelta {
  readonly baseline: number;
  readonly variant: number;
  readonly delta: number;
}

export interface OverlayEffectsSummary {
  readonly pass: number;
  readonly annotate: number;
  readonly patch: number;
  readonly veto: number;
}

export interface ComparisonVariant {
  readonly runId: string;
  readonly overlayRefs: readonly Ref[];
  readonly metricDeltas: Readonly<Record<string, MetricDelta>>;
  readonly tradeOutcomeChanged: boolean;
  readonly overlayEffectsSummary: OverlayEffectsSummary;
}

export interface ComparisonSummary {
  readonly baselineRunId: string;
  readonly variants: readonly ComparisonVariant[];
}

/** Build a stable cross-run cache key from the DATA dimensions of a run. Symbol order is normalized. */
export function tapeCacheKey(parts: {
  datasetRef: string;
  symbols: readonly string[];
  from: string | number;
  to: string | number;
  timeframe?: string;
}): string {
  const syms = [...parts.symbols].sort().join(',');
  return `${parts.datasetRef}|${parts.timeframe ?? ''}|${parts.from}|${parts.to}|${syms}`;
}

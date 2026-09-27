export function octaveAdjustedTempoError(
  candidate: number,
  baseline: number,
): number {
  if (!(candidate >= 0) || !(baseline > 0)) return Number.POSITIVE_INFINITY;
  return (
    Math.min(
      Math.abs(candidate - baseline),
      Math.abs(candidate / 2 - baseline),
      Math.abs(candidate * 2 - baseline),
    ) / baseline
  );
}

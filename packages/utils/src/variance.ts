export interface VarianceResult {
  variance: number | null;
  /**
   * Variance as a percentage of plan (Actual - Plan) / Plan * 100.
   * `null` when there is no meaningful plan (plan missing or plan === 0).
   * Callers render "N/A" or "—" in those cases — never NaN/infinity.
   */
  variancePct: number | null;
}

/**
 * Core variance math, shared by backend report generation and the frontend.
 *
 * Edge cases:
 * - `plan === 0`: variance = actual - 0 = actual; variancePct = null → "N/A".
 * - `plan` null/undefined (no target set): variance = null → callers show "—".
 */
export function computeVariance(
  plan: number | null | undefined,
  actual: number
): VarianceResult {
  if (plan === null || plan === undefined) {
    return { variance: null, variancePct: null };
  }
  const variance = actual - plan;
  if (plan === 0) {
    return { variance, variancePct: null };
  }
  return { variance, variancePct: (variance / plan) * 100 };
}
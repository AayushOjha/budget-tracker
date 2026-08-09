import { compareMonths, listMonths } from './months';
import { ActualRecord, Month, PlanRecord, ReportResponse, ReportRow, ReportTotals } from './types';
import { computeVariance } from './variance';

export interface CategoryLookup {
  id: string;
  name: string;
}

export interface ReportInput {
  start: Month;
  end: Month;
  categories: CategoryLookup[];
  plans: PlanRecord[];
  actuals: ActualRecord[];
}

/**
 * Pure aggregation: one row per (category × month) inside [start, end].
 *
 * Documented decisions:
 * - Missing actual is treated as 0 for variance math (hasActual=false lets the UI
 *   still render "—" where desired). Consistent with the assignment's sample data.
 * - Plan of 0 (or missing plan) never yields NaN: variancePct is null → UI shows "—".
 */
export function buildReport(input: ReportInput): ReportResponse {
  const { start, end, categories } = input;

  const plans = new Map<string, number>();
  for (const p of input.plans) plans.set(`${p.categoryId}|${p.month}`, p.amount);

  const actuals = new Map<string, { amount: number; count: number }>();
  for (const a of input.actuals) {
    const key = `${a.categoryId}|${a.month}`;
    const cur = actuals.get(key);
    actuals.set(key, { amount: (cur?.amount ?? 0) + a.amount, count: (cur?.count ?? 0) + 1 });
  }

  const rows: ReportRow[] = [];
  for (const month of listMonths(start, end)) {
    for (const category of categories) {
      const key = `${category.id}|${month}`;
      const plan = plans.get(key) ?? null;
      const actualEntry = actuals.get(key);
      const actual = actualEntry?.amount ?? 0;

      const { variance, variancePct } = computeVariance(plan, actual);

      rows.push({
        month,
        categoryId: category.id,
        categoryName: category.name,
        plan: plan ?? 0,
        actual,
        hasActual: (actualEntry?.count ?? 0) > 0,
        variance,
        variancePct,
      });
    }
  }

  rows.sort((a, b) => compareMonths(a.month, b.month) || a.categoryName.localeCompare(b.categoryName));

  // Per-month net totals (sum across categories for the range chart).
  const byMonth = new Map<Month, { plan: number; actual: number }>();
  for (const row of rows) {
    const cur = byMonth.get(row.month) ?? { plan: 0, actual: 0 };
    cur.plan += row.plan;
    cur.actual += row.actual;
    byMonth.set(row.month, cur);
  }

  const totals: ReportTotals[] = [...byMonth.entries()]
    .sort(([a], [b]) => compareMonths(a, b))
    .map(([month, { plan, actual }]) => {
      const { variance, variancePct } = computeVariance(plan, actual);
      return {
        month,
        plan,
        actual,
        variance,
        variancePct,
      };
    });

  return { rows, totals };
}
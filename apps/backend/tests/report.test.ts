import { describe, expect, test } from 'bun:test';
import { buildReport } from '@tracker/utils';

const MARKETING = { id: 'm', name: 'Marketing' };
const PAYROLL = { id: 'p', name: 'Payroll' };

test('sample data: variance math matches the assignment table', () => {
  const report = buildReport({
    start: '2026-01',
    end: '2026-02',
    categories: [MARKETING, PAYROLL],
    plans: [
      { categoryId: 'm', month: '2026-01', amount: 5000 },
      { categoryId: 'm', month: '2026-02', amount: 5000 },
      { categoryId: 'p', month: '2026-01', amount: 20000 },
      { categoryId: 'p', month: '2026-02', amount: 20000 },
    ],
    actuals: [
      { categoryId: 'm', month: '2026-01', amount: 4800 },
      { categoryId: 'p', month: '2026-01', amount: 20500 },
      { categoryId: 'p', month: '2026-02', amount: 19800 },
    ],
  });

  const row = (categoryId: string, month: string) =>
    report.rows.find((r) => r.categoryId === categoryId && r.month === month)!;

  // 2026-01 Marketing: 5,000 / 4,800 / -200 / -4.00%
  let r = row('m', '2026-01');
  expect(r.plan).toBe(5000);
  expect(r.actual).toBe(4800);
  expect(r.variance).toBe(-200);
  expect(r.variancePct).toBeCloseTo(-4.0, 2);

  // 2026-01 Payroll: 20,000 / 20,500 / +500 / +2.50%
  r = row('p', '2026-01');
  expect(r.variance).toBe(500);
  expect(r.variancePct).toBeCloseTo(2.5, 2);

  // 2026-02 Marketing: missing actual is treated as 0 (documented choice)
  r = row('m', '2026-02');
  expect(r.hasActual).toBe(false);
  expect(r.actual).toBe(0);
  expect(r.variance).toBe(-5000);
  expect(r.variancePct).toBeCloseTo(-100, 2);

  // 2026-02 Payroll: −200 / −1.00%
  r = row('p', '2026-02');
  expect(r.variance).toBe(-200);
  expect(r.variancePct).toBeCloseTo(-1.0, 2);
});

test('buildReport: plan = 0 yields variance = actual and N/A percentage (no NaN)', () => {
  const report = buildReport({
    start: '2026-03',
    end: '2026-03',
    categories: [{ id: 't', name: 'Tools' }],
    plans: [{ categoryId: 't', month: '2026-03', amount: 0 }],
    actuals: [{ categoryId: 't', month: '2026-03', amount: 250 }],
  });

  const row = report.rows[0];
  expect(row.plan).toBe(0);
  expect(row.actual).toBe(250);
  expect(row.variance).toBe(250);
  expect(row.variancePct).toBeNull();
  expect(Number.isNaN(row.variance)).toBe(false);
});

test('buildReport: no plan at all renders row with plan 0 and N/A variance', () => {
  const report = buildReport({
    start: '2026-04',
    end: '2026-04',
    categories: [{ id: 'h', name: 'Hosting' }],
    plans: [],
    actuals: [{ categoryId: 'h', month: '2026-04', amount: 120 }],
  });

  expect(report.rows).toHaveLength(1);
  expect(report.rows[0].plan).toBe(0);
  expect(report.rows[0].actual).toBe(120);
  expect(report.rows[0].variance).toBeNull();
  expect(report.rows[0].variancePct).toBeNull();
});

test('buildReport: multiple actuals in same month are summed', () => {
  const report = buildReport({
    start: '2026-05',
    end: '2026-05',
    categories: [{ id: 'c', name: 'Coffee' }],
    plans: [],
    actuals: [
      { categoryId: 'c', month: '2026-05', amount: 10 },
      { categoryId: 'c', month: '2026-05', amount: 20 },
      { categoryId: 'c', month: '2026-05', amount: 30 },
    ],
  });

  expect(report.rows[0].actual).toBe(60);
});

test('buildReport: monthly totals aggregate across categories and match plan/actual sums', () => {
  const report = buildReport({
    start: '2026-01',
    end: '2026-02',
    categories: [MARKETING, PAYROLL],
    plans: [
      { categoryId: 'm', month: '2026-01', amount: 5000 },
      { categoryId: 'p', month: '2026-01', amount: 20000 },
    ],
    actuals: [
      { categoryId: 'm', month: '2026-01', amount: 4000 },
      { categoryId: 'p', month: '2026-01', amount: 21000 },
    ],
  });

  expect(report.totals).toHaveLength(2);
  const jan = report.totals.find((t) => t.month === '2026-01')!;
  expect(jan.plan).toBe(25000);
  expect(jan.actual).toBe(25000);
  expect(jan.variance).toBe(0);
  const feb = report.totals.find((t) => t.month === '2026-02')!;
  expect(feb.plan).toBe(0); // no plans -> 0, not NaN
  expect(feb.variancePct).toBeNull();
});

test('buildReport: rows are sorted by month then category', () => {
  const report = buildReport({
    start: '2026-01',
    end: '2026-01',
    categories: [PAYROLL, MARKETING, { id: 't', name: 'Tools' }],
    plans: [
      { categoryId: 'p', month: '2026-01', amount: 5 },
      { categoryId: 'm', month: '2026-01', amount: 5 },
    ],
    actuals: [],
  });
  expect(report.rows.map((r) => r.categoryName)).toEqual(['Marketing', 'Payroll', 'Tools']);
});
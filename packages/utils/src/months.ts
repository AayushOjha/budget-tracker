import { Month } from './types';

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

export function isMonth(value: string): value is Month {
  return MONTH_RE.test(value);
}

export function assertMonth(value: string): Month {
  if (!isMonth(value)) {
    throw new Error(`Invalid month "${value}", expected YYYY-MM`);
  }
  return value;
}

/** Compare two months, returns negative / zero / positive like localeCompare. */
export function compareMonths(a: Month, b: Month): number {
  assertMonth(a);
  assertMonth(b);
  return a === b ? 0 : a < b ? -1 : 1;
}

/** All months from start to end inclusive, e.g. 2026-01..2026-03 -> 3 strings. */
export function listMonths(start: Month, end: Month): Month[] {
  assertMonth(start);
  assertMonth(end);
  const [sy, sm] = start.split('-').map(Number);
  const [ey, em] = end.split('-').map(Number);
  const out: Month[] = [];
  let y = sy;
  let m = sm;
  while (y < ey || (y === ey && m <= em)) {
    out.push(`${y}-${String(m).padStart(2, '0')}` as Month);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return out;
}

export function currentMonth(): Month {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` as Month;
}

export function formatMonth(month: Month): string {
  const [y, m] = month.split('-');
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${names[Number(m) - 1]} ${y}`;
}


/** Shift a month by `delta` months (positive = forward, negative = backward). */
export function shiftMonth(month: Month, delta: number): Month {
  const [y, m] = month.split('-').map(Number);
  const total = y * 12 + (m - 1) + delta;
  const ny = Math.floor(total / 12);
  const nm = ((total % 12) + 12) % 12 + 1; // handles negative mod correctly
  return `${ny}-${String(nm).padStart(2, '0')}` as Month;
}
export function formatMoney(amount: number): string {
  return amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

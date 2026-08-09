import { Month } from '@tracker/utils';

export class LockedPeriodError extends Error {
  constructor(months: string[]) {
    super(`Period is locked and read-only: ${months.join(', ')}`);
    this.name = 'LockedPeriodError';
  }
}

/**
 * Pure lock check used by routes (and unit-tested).
 * Rejects a write if ANY of the supplied months is locked,
 * with a clear server-side error — the API must enforce locks even if
 * the UI hides the controls.
 */
export function assertNotLocked(lockedMonths: ReadonlySet<string>, months: readonly string[]): void {
  const locked = months.filter((m) => lockedMonths.has(m));
  if (locked.length > 0) {
    throw new LockedPeriodError(locked);
  }
}

export function isLocked(lockedMonths: ReadonlySet<string>, month: string): boolean {
  return lockedMonths.has(month);
}
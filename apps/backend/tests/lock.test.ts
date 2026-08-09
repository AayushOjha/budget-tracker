import { describe, expect, test } from 'bun:test';
import { assertNotLocked, LockedPeriodError, isLocked } from '../src/lib/lock';

describe('lock enforcement', () => {
  test('throws when the target month is locked', () => {
    const locked = new Set(['2026-01']);
    expect(() => assertNotLocked(locked, ['2026-01'])).toThrow(LockedPeriodError);
  });

  test('throws when any of several months is locked', () => {
    const locked = new Set(['2026-02']);
    expect(() => assertNotLocked(locked, ['2026-01', '2026-02', '2026-03'])).toThrow(/2026-02/);
  });

  test('passes for open months', () => {
    const locked = new Set(['2026-01']);
    expect(() => assertNotLocked(locked, ['2026-07'])).not.toThrow();
  });

  test('passes for an empty lock set', () => {
    expect(() => assertNotLocked(new Set(), ['2026-01'])).not.toThrow();
  });

  test('isLocked reports membership', () => {
    const locked = new Set(['2026-01']);
    expect(isLocked(locked, '2026-01')).toBe(true);
    expect(isLocked(locked, '2026-02')).toBe(false);
  });
});
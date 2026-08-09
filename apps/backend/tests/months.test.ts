import { describe, expect, test } from 'bun:test';
import { assertMonth, compareMonths, isMonth, listMonths, currentMonth, formatMonth } from '@tracker/utils';

describe('month helpers', () => {
  test('isMonth accepts YYYY-MM and rejects others', () => {
    expect(isMonth('2026-01')).toBe(true);
    expect(isMonth('2026-1')).toBe(false);
    expect(isMonth('2026-13')).toBe(false);
    expect(isMonth('26-01')).toBe(false);
    expect(isMonth('2026-00')).toBe(false);
  });

  test('assertMonth throws on invalid input', () => {
    expect(() => assertMonth('2026-13')).toThrow(/YYYY-MM/);
    expect(() => assertMonth('bad')).toThrow(/YYYY-MM/);
  });

  test('listMonths spans years and returns inclusive range', () => {
    expect(listMonths('2025-11', '2026-02')).toEqual([
      '2025-11',
      '2025-12',
      '2026-01',
      '2026-02',
    ]);
    expect(listMonths('2026-01', '2026-01')).toEqual(['2026-01']);
  });

  test('compareMonths orders correctly', () => {
    expect(compareMonths('2026-01', '2026-02')).toBeLessThan(0);
    expect(compareMonths('2026-03', '2026-01')).toBeGreaterThan(0);
    expect(compareMonths('2026-01', '2026-01')).toBe(0);
    expect(compareMonths('2025-12', '2026-01')).toBeLessThan(0);
  });

  test('currentMonth and formatMonth', () => {
    expect(isMonth(currentMonth())).toBe(true);
    expect(formatMonth('2026-01')).toBe('Jan 2026');
  });
});
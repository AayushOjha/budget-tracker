import { describe, expect, test } from 'bun:test';
import { computeVariance } from '@tracker/utils';

describe('variance math', () => {
  test('under plan → negative variance and negative %', () => {
    expect(computeVariance(5000, 4800)).toEqual({ variance: -200, variancePct: -4 });
  });

  test('over plan → positive variance and positive %', () => {
    expect(computeVariance(20000, 20500)).toEqual({ variance: 500, variancePct: 2.5 });
  });

  test('on plan → zero variance and zero %', () => {
    expect(computeVariance(100, 100)).toEqual({ variance: 0, variancePct: 0 });
  });

  test('plan = 0 → never NaN/infinity, % is null (rendered as N/A)', () => {
    expect(computeVariance(0, 250)).toEqual({ variance: 250, variancePct: null });
    expect(computeVariance(0, 0)).toEqual({ variance: 0, variancePct: null });
  });

  test('no plan → variance null (rendered as —)', () => {
    expect(computeVariance(null, 250)).toEqual({ variance: null, variancePct: null });
    expect(computeVariance(undefined, 250)).toEqual({ variance: null, variancePct: null });
  });
});
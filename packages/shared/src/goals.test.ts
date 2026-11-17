import { describe, expect, it } from 'vitest';
import { progressFor, type Goal } from './goals';

const walk: Goal = { id: 'walk', label: 'Daily walk minutes', target: 60, source: 'self' };

describe('progressFor', () => {
  it('sums entries and reports partial progress', () => {
    expect(progressFor(walk, [20, 15])).toEqual({
      goalId: 'walk', total: 35, target: 60, percent: 58, met: false,
    });
  });

  it('caps percent at 100 and marks met when target is reached', () => {
    const p = progressFor(walk, [60, 30]);
    expect(p.percent).toBe(100);
    expect(p.met).toBe(true);
  });

  it('ignores non-finite values', () => {
    expect(progressFor(walk, [NaN, 10, Infinity]).total).toBe(10);
  });

  it('returns zero percent for a non-positive target', () => {
    expect(progressFor({ ...walk, target: 0 }, [5]).percent).toBe(0);
    expect(progressFor({ ...walk, target: 0 }, [5]).met).toBe(false);
  });
});

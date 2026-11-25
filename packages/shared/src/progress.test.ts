import { describe, expect, it } from 'vitest';
import {
  entriesInPeriod,
  combineDateAndTime,
  formatTime,
  nowFormValues,
  msUntilNextDay,
  parseEntryInput,
  periodRange,
  summarizeGoal,
  validateEntry,
  type EntryFormInput,
} from './progress';

// Wednesday 25 November 2026, 10:30 local time. Built from local parts so tests do not depend on the machine's time zone.
const now = new Date(2026, 10, 25, 10, 30);
const at = (y: number, m: number, d: number, h = 12) => new Date(y, m, d, h).toISOString();

const walk = { id: 'g1', targetValue: 60, unit: 'minutes', period: 'daily' as const };
const meals = { id: 'g2', targetValue: 5, unit: 'walks', period: 'weekly' as const };
const entry = (goalId: string | null, value: number, loggedAt: string) => ({ goalId, value, loggedAt });

describe('periodRange', () => {
  it('covers today for a daily goal', () => {
    const { start, end } = periodRange('daily', now);
    expect(start).toEqual(new Date(2026, 10, 25));
    expect(end).toEqual(new Date(2026, 10, 26));
  });

  it('runs Monday to Sunday for a weekly goal', () => {
    const { start, end } = periodRange('weekly', now);
    expect(start).toEqual(new Date(2026, 10, 23));
    expect(end).toEqual(new Date(2026, 10, 30));
  });

  it('starts the week on the same day when today is Monday', () => {
    expect(periodRange('weekly', new Date(2026, 10, 23, 8)).start).toEqual(new Date(2026, 10, 23));
  });

  it('keeps Sunday in the week that began the previous Monday', () => {
    expect(periodRange('weekly', new Date(2026, 10, 29, 23, 59)).start).toEqual(new Date(2026, 10, 23));
  });

  it('crosses month and year boundaries', () => {
    expect(periodRange('daily', new Date(2026, 11, 31, 9)).end).toEqual(new Date(2027, 0, 1));
    expect(periodRange('weekly', new Date(2027, 0, 1, 9)).start).toEqual(new Date(2026, 11, 28));
  });
});

describe('msUntilNextDay', () => {
  it('counts down to the next local midnight', () => {
    expect(msUntilNextDay(new Date(2026, 10, 25, 23, 0))).toBe(60 * 60 * 1000);
    expect(msUntilNextDay(new Date(2026, 10, 25, 0, 0))).toBe(24 * 60 * 60 * 1000);
  });

  it('is one second just before midnight and crosses the year end', () => {
    expect(msUntilNextDay(new Date(2026, 11, 31, 23, 59, 59))).toBe(1000);
  });
});

describe('formatTime and nowFormValues', () => {
  it('pads to 24-hour HH:mm', () => {
    expect(formatTime(new Date(2026, 10, 25, 7, 5))).toBe('07:05');
    expect(formatTime(new Date(2026, 10, 25, 0, 0))).toBe('00:00');
    expect(formatTime(new Date(2026, 10, 25, 23, 59))).toBe('23:59');
  });

  it('starts the form at the current local date and time', () => {
    expect(nowFormValues(now)).toEqual({ date: '2026-11-25', time: '10:30' });
  });
});

describe('combineDateAndTime', () => {
  it('builds a local date and time', () => {
    expect(combineDateAndTime('2026-11-24', '14:30')).toEqual(new Date(2026, 10, 24, 14, 30));
    expect(combineDateAndTime(' 2026-11-24 ', ' 07:05 ')).toEqual(new Date(2026, 10, 24, 7, 5));
  });

  it.each([
    ['2026-02-30', '10:00'],
    ['2026-13-01', '10:00'],
    ['25/11/2026', '10:00'],
    ['', '10:00'],
    ['2026-11-24', '24:00'],
    ['2026-11-24', '9:30'],
    ['2026-11-24', '10:60'],
    ['2026-11-24', '10:30 PM'],
    ['2026-11-24', ''],
  ])('rejects %s %s', (date, time) => {
    expect(combineDateAndTime(date, time)).toBeNull();
  });
});

describe('summarizeGoal', () => {
  it('adds up only this goal, in this period', () => {
    const entries = [
      entry('g1', 30, at(2026, 10, 25, 8)),
      entry('g1', 15, at(2026, 10, 25, 9)),
      entry('g1', 40, at(2026, 10, 24)), // yesterday
      entry('g2', 99, at(2026, 10, 25)), // another goal
      entry(null, 99, at(2026, 10, 25)), // goal since deleted
    ];
    const p = summarizeGoal(walk, entries, now);
    expect(p.total).toBe(45);
    expect(p.remaining).toBe(15);
    expect(p.percent).toBe(75);
    expect(p.met).toBe(false);
    expect(p.text).toBe('45 of 60 minutes today');
  });

  it('is met at exactly the target and caps the bar at 100', () => {
    expect(summarizeGoal(walk, [entry('g1', 60, at(2026, 10, 25))], now).met).toBe(true);
    const over = summarizeGoal(walk, [entry('g1', 90, at(2026, 10, 25))], now);
    expect(over.percent).toBe(100);
    expect(over.remaining).toBe(0);
    expect(over.text).toBe('90 of 60 minutes today');
  });

  it('counts a whole week and names it', () => {
    const entries = [
      entry('g2', 1, at(2026, 10, 23, 7)), // Monday
      entry('g2', 1, at(2026, 10, 25)),
      entry('g2', 1, at(2026, 10, 29, 22)), // Sunday
      entry('g2', 1, at(2026, 10, 22)), // last week
      entry('g2', 1, at(2026, 10, 30, 1)), // next week
    ];
    const p = summarizeGoal(meals, entries, now);
    expect(p.total).toBe(3);
    expect(p.text).toBe('3 of 5 walks this week');
  });

  it('uses the singular unit when the target is 1', () => {
    const dose = { id: 'g3', targetValue: 1, unit: 'doses', period: 'daily' as const };
    expect(summarizeGoal(dose, [], now).text).toBe('0 of 1 dose today');
  });

  it('omits the unit when there is none', () => {
    expect(summarizeGoal({ ...walk, unit: null }, [], now).text).toBe('0 of 60 today');
  });

  it('avoids floating point drift', () => {
    const entries = [entry('g1', 0.1, at(2026, 10, 25)), entry('g1', 0.2, at(2026, 10, 25))];
    expect(summarizeGoal({ ...walk, targetValue: 1 }, entries, now).total).toBe(0.3);
  });

  it('ignores bad timestamps and non-finite values', () => {
    const entries = [entry('g1', 10, 'not a date'), entry('g1', Number.NaN, at(2026, 10, 25)), entry('g1', 5, at(2026, 10, 25))];
    expect(summarizeGoal(walk, entries, now).total).toBe(5);
  });
});

describe('entriesInPeriod', () => {
  it('returns this goal and period only, newest first', () => {
    const a = { ...entry('g1', 1, at(2026, 10, 25, 8)), id: 'a' };
    const b = { ...entry('g1', 2, at(2026, 10, 25, 9)), id: 'b' };
    const old = { ...entry('g1', 3, at(2026, 10, 24)), id: 'c' };
    const other = { ...entry('g2', 4, at(2026, 10, 25)), id: 'd' };
    expect(entriesInPeriod(walk, [a, old, b, other], now).map((e) => e.id)).toEqual(['b', 'a']);
  });
});

const valid: EntryFormInput = { value: '30', date: '2026-11-25', time: '09:00', note: '' };

describe('validateEntry', () => {
  it('accepts a plain amount at a past time', () => {
    expect(validateEntry(valid, now)).toEqual({});
  });

  it('accepts a decimal comma and thousands', () => {
    expect(validateEntry({ ...valid, value: '1,5' }, now)).toEqual({});
    expect(validateEntry({ ...valid, value: '8,000' }, now)).toEqual({});
  });

  it.each([
    ['', /amount/],
    ['abc', /number/],
    ['0', /more than zero/],
    ['-3', /number/],
    ['0.004', /number/],
    ['99999999999', /too large/],
  ])('rejects amount %j', (value, message) => {
    expect(validateEntry({ ...valid, value }, now).value).toMatch(message);
  });

  it('requires a real date', () => {
    expect(validateEntry({ ...valid, date: '' }, now).date).toMatch(/date/i);
    expect(validateEntry({ ...valid, date: '2026-02-30' }, now).date).toMatch(/date/i);
  });

  it('requires 24-hour HH:mm', () => {
    expect(validateEntry({ ...valid, time: '9:30' }, now).time).toMatch(/24-hour/);
    expect(validateEntry({ ...valid, time: '25:00' }, now).time).toMatch(/24-hour/);
    expect(validateEntry({ ...valid, time: '' }, now).time).toMatch(/24-hour/);
  });

  it('allows now and a minute of clock drift but not the future', () => {
    expect(validateEntry({ ...valid, time: '10:30' }, now)).toEqual({});
    expect(validateEntry({ ...valid, time: '10:31' }, now)).toEqual({});
    expect(validateEntry({ ...valid, time: '10:32' }, now).time).toMatch(/not happened/);
    expect(validateEntry({ ...valid, date: '2026-11-26', time: '00:00' }, now).time).toMatch(/not happened/);
  });

  it('allows an earlier day at any time', () => {
    expect(validateEntry({ ...valid, date: '2026-11-24', time: '23:59' }, now)).toEqual({});
  });

  it('reports date and time problems together with a bad amount', () => {
    const errors = validateEntry({ value: '', date: '', time: '', note: '' }, now);
    expect(Object.keys(errors).sort()).toEqual(['date', 'time', 'value']);
  });

  it('limits the note length', () => {
    expect(validateEntry({ ...valid, note: 'x'.repeat(501) }, now).note).toMatch(/500/);
    expect(validateEntry({ ...valid, note: 'x'.repeat(500) }, now)).toEqual({});
  });
});

describe('parseEntryInput', () => {
  it('cleans the values for saving', () => {
    expect(parseEntryInput({ value: ' 1,5 ', date: '2026-11-24', time: '14:30', note: '  at the park ' })).toEqual({
      value: 1.5,
      loggedAt: new Date(2026, 10, 24, 14, 30),
      note: 'at the park',
    });
  });

  it('turns an empty note into null', () => {
    expect(parseEntryInput(valid).note).toBeNull();
  });
});

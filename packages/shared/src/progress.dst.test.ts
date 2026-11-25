import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { combineDateAndTime, parseEntryInput, validateEntry } from './progress';

// Clocks change on these dates in New York: 8 March 2026 (02:00 jumps to 03:00) and 1 November 2026 (02:00 returns to 01:00).
// The time zone is set for this file only and restored afterwards.
// This package is shared with the mobile app and has no Node type definitions, so the test reads the
// environment through a narrow local type instead of importing Node's.
const env = (globalThis as unknown as { process: { env: Record<string, string | undefined> } }).process.env;

let originalTz: string | undefined;

beforeAll(() => {
  originalTz = env.TZ;
  env.TZ = 'America/New_York';
});

afterAll(() => {
  if (originalTz === undefined) delete env.TZ;
  else env.TZ = originalTz;
});

const now = () => new Date(2026, 10, 25, 10, 30);

describe('clock changes', () => {
  it('runs in the New York time zone', () => {
    // 02:30 does not exist on 8 March, so the platform moves it to 03:30. This guards the tests below.
    expect(new Date(2026, 2, 8, 2, 30).getHours()).toBe(3);
  });

  it('rejects a time that is skipped when clocks move forward', () => {
    expect(combineDateAndTime('2026-03-08', '02:30')).toBeNull();
    expect(combineDateAndTime('2026-03-08', '02:00')).toBeNull();
    expect(combineDateAndTime('2026-03-08', '02:59')).toBeNull();
  });

  it('accepts the times either side of the skipped hour', () => {
    expect(combineDateAndTime('2026-03-08', '01:59')).toEqual(new Date(2026, 2, 8, 1, 59));
    expect(combineDateAndTime('2026-03-08', '03:00')).toEqual(new Date(2026, 2, 8, 3, 0));
  });

  it('accepts the same time on other days', () => {
    expect(combineDateAndTime('2026-03-07', '02:30')).toEqual(new Date(2026, 2, 7, 2, 30));
    expect(combineDateAndTime('2026-03-09', '02:30')).toEqual(new Date(2026, 2, 9, 2, 30));
  });

  it('accepts a time that happens twice when clocks move back, keeping the hour typed', () => {
    const when = combineDateAndTime('2026-11-01', '01:30');
    expect(when).not.toBeNull();
    expect(when?.getHours()).toBe(1);
    expect(when?.getMinutes()).toBe(30);
  });

  it('tells the owner instead of saving a different time', () => {
    const input = { value: '30', date: '2026-03-08', time: '02:30', note: '' };
    expect(validateEntry(input, now()).time).toMatch(/does not exist/);
  });

  it('never saves a shifted time for an accepted entry', () => {
    const input = { value: '30', date: '2026-03-08', time: '03:30', note: '' };
    expect(validateEntry(input, now())).toEqual({});
    expect(parseEntryInput(input).loggedAt).toEqual(new Date(2026, 2, 8, 3, 30));
  });
});

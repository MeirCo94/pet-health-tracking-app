import { parseDate, toLocalDateString } from './dogs';
import { formatNumber, MAX_GOAL_TARGET, parseTarget, singular } from './goalSetup';
import type { DogGoal, GoalPeriod } from './goalSetup';

export const MAX_ENTRY_NOTE_LENGTH = 500;

/** One logged value for a dog. goalId is null when the goal it counted toward was deleted. */
export interface DogEntry {
  id: string;
  dogId: string;
  goalId: string | null;
  metric: string;
  value: number;
  /** ISO timestamp. */
  loggedAt: string;
  source: 'manual' | 'healthkit' | 'fitbark' | 'import';
  note: string | null;
}

/** What the log form holds: raw text, nothing parsed yet. */
export interface EntryFormInput {
  value: string;
  /** YYYY-MM-DD, local. */
  date: string;
  /** 24-hour HH:mm, local. */
  time: string;
  note: string;
}

export interface EntryValues {
  value: number;
  loggedAt: Date;
  note: string | null;
}

export interface EntryFormErrors {
  value?: string;
  date?: string;
  time?: string;
  note?: string;
}

const TIME_SHAPE = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** How far ahead of the clock a logged time may be, to forgive small clock differences. */
const FUTURE_TOLERANCE_MS = 60 * 1000;

/** A time as 24-hour HH:mm, for example "07:05". */
export function formatTime(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

/** The form's starting date and time: right now. */
export function nowFormValues(now: Date): { date: string; time: string } {
  return { date: toLocalDateString(now), time: formatTime(now) };
}

/**
 * Combines YYYY-MM-DD and HH:mm in local time. Returns null if either is not valid, or if the time
 * does not exist on that date: when clocks move forward, 02:30 is skipped, and the Date constructor
 * would quietly turn it into 03:30. A time that happens twice when clocks move back is accepted
 * and means its first occurrence.
 */
export function combineDateAndTime(date: string, time: string): Date | null {
  const d = parseDate(date.trim());
  const t = TIME_SHAPE.exec(time.trim());
  if (!d || !t) return null;
  const hours = Number(t[1]);
  const minutes = Number(t[2]);
  const result = new Date(d.year, d.month - 1, d.day, hours, minutes, 0, 0);
  const unchanged =
    result.getFullYear() === d.year &&
    result.getMonth() === d.month - 1 &&
    result.getDate() === d.day &&
    result.getHours() === hours &&
    result.getMinutes() === minutes;
  return unchanged ? result : null;
}

/**
 * The half-open window [start, end) in the device's local time that a goal period covers.
 * Daily is today. Weekly is the calendar week, Monday to Sunday.
 */
export function periodRange(period: GoalPeriod, now: Date): { start: Date; end: Date } {
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();
  if (period === 'daily') return { start: new Date(y, m, d), end: new Date(y, m, d + 1) };
  const sinceMonday = (now.getDay() + 6) % 7;
  return { start: new Date(y, m, d - sinceMonday), end: new Date(y, m, d - sinceMonday + 7) };
}

/** Milliseconds from `now` until the next local midnight, when daily and weekly totals may roll over. */
export function msUntilNextDay(now: Date): number {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime() - now.getTime();
}

/** The earliest moment any goal's current period can begin: the start of this week. */
export function earliestPeriodStart(now: Date): Date {
  return periodRange('weekly', now).start;
}

export interface GoalProgress {
  goalId: string;
  total: number;
  target: number;
  /** 0 to 100, capped, for drawing a bar. */
  percent: number;
  met: boolean;
  remaining: number;
  /** For example "45 of 60 minutes today". */
  text: string;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Progress toward one goal for the period that contains `now`. Entries for other goals or periods are ignored. */
export function summarizeGoal(
  goal: Pick<DogGoal, 'id' | 'targetValue' | 'unit' | 'period'>,
  entries: readonly Pick<DogEntry, 'goalId' | 'value' | 'loggedAt'>[],
  now: Date,
): GoalProgress {
  const { start, end } = periodRange(goal.period, now);
  let sum = 0;
  for (const entry of entries) {
    if (entry.goalId !== goal.id) continue;
    const at = new Date(entry.loggedAt).getTime();
    if (Number.isNaN(at) || at < start.getTime() || at >= end.getTime()) continue;
    if (Number.isFinite(entry.value)) sum += entry.value;
  }
  const total = round2(sum);
  const target = goal.targetValue;
  const met = target > 0 && total >= target;
  const unit = goal.unit ? ` ${target === 1 ? singular(goal.unit) : goal.unit}` : '';
  return {
    goalId: goal.id,
    total,
    target,
    percent: target > 0 ? Math.min(100, Math.round((total / target) * 100)) : 0,
    met,
    remaining: round2(Math.max(0, target - total)),
    text: `${formatNumber(total)} of ${formatNumber(target)}${unit} ${goal.period === 'daily' ? 'today' : 'this week'}`,
  };
}

/** Entries that count toward the goal's current period, newest first. */
export function entriesInPeriod<T extends Pick<DogEntry, 'goalId' | 'loggedAt'>>(
  goal: Pick<DogGoal, 'id' | 'period'>,
  entries: readonly T[],
  now: Date,
): T[] {
  const { start, end } = periodRange(goal.period, now);
  return entries
    .filter((e) => {
      const at = new Date(e.loggedAt).getTime();
      return e.goalId === goal.id && at >= start.getTime() && at < end.getTime();
    })
    .sort((a, b) => new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime());
}

export function validateEntry(input: EntryFormInput, now: Date = new Date()): EntryFormErrors {
  const errors: EntryFormErrors = {};
  const value = parseTarget(input.value);
  if (input.value.trim().length === 0) errors.value = 'Enter an amount.';
  else if (value === null) errors.value = 'Enter a number, for example 30. Use at most 2 decimal places.';
  else if (value <= 0) errors.value = 'The amount must be more than zero.';
  else if (value > MAX_GOAL_TARGET) errors.value = 'That number is too large.';

  const dateOk = parseDate(input.date.trim()) !== null;
  const timeOk = TIME_SHAPE.test(input.time.trim());
  if (!dateOk) errors.date = 'Choose a date.';
  if (!timeOk) errors.time = 'Use 24-hour time, like 07:30 or 14:30.';
  if (dateOk && timeOk) {
    const when = combineDateAndTime(input.date, input.time);
    if (!when) errors.time = 'That time does not exist on that date because the clocks changed. Choose another time.';
    else if (when.getTime() > now.getTime() + FUTURE_TOLERANCE_MS) errors.time = 'That time has not happened yet.';
  }

  if (input.note.length > MAX_ENTRY_NOTE_LENGTH) errors.note = `Use ${MAX_ENTRY_NOTE_LENGTH} characters or fewer.`;
  return errors;
}

/** Cleans form text for saving. Call only after validateEntry finds no errors. */
export function parseEntryInput(input: EntryFormInput): EntryValues {
  const note = input.note.trim();
  return {
    value: parseTarget(input.value) ?? 0,
    loggedAt: combineDateAndTime(input.date, input.time) ?? new Date(),
    note: note.length > 0 ? note : null,
  };
}

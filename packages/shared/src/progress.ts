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
  day: LogDay;
  note: string;
}

export interface EntryValues {
  value: number;
  loggedAt: Date;
  note: string | null;
}

export interface EntryFormErrors {
  value?: string;
  note?: string;
}

export type LogDay = 'today' | 'yesterday';

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

/** When to record an entry: right now for today, or noon yesterday for a forgotten day. */
export function loggedAtFor(day: LogDay, now: Date): Date {
  if (day === 'today') return new Date(now.getTime());
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 12, 0, 0);
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

export function validateEntry(input: EntryFormInput): EntryFormErrors {
  const errors: EntryFormErrors = {};
  const value = parseTarget(input.value);
  if (input.value.trim().length === 0) errors.value = 'Enter an amount.';
  else if (value === null) errors.value = 'Enter a number, for example 30. Use at most 2 decimal places.';
  else if (value <= 0) errors.value = 'The amount must be more than zero.';
  else if (value > MAX_GOAL_TARGET) errors.value = 'That number is too large.';
  if (input.note.length > MAX_ENTRY_NOTE_LENGTH) errors.note = `Use ${MAX_ENTRY_NOTE_LENGTH} characters or fewer.`;
  return errors;
}

/** Cleans form text for saving. Call only after validateEntry finds no errors. */
export function parseEntryInput(input: EntryFormInput, now: Date): EntryValues {
  const note = input.note.trim();
  return {
    value: parseTarget(input.value) ?? 0,
    loggedAt: loggedAtFor(input.day, now),
    note: note.length > 0 ? note : null,
  };
}

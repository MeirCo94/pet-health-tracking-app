import { toLocalDateString } from './dogs';

export const EXPORT_FORMAT = 'watchdog-export';
export const EXPORT_VERSION = 1;

/** The word the owner types to confirm deleting their account. */
export const DELETE_CONFIRMATION_WORD = 'DELETE';

type Row = Record<string, unknown>;

export interface ExportInput {
  exportedAt: Date;
  email: string | null;
  dogs: readonly Row[];
  goals: readonly Row[];
  entries: readonly Row[];
}

/** Everything the app holds for one owner, in a form that can be saved as a file and read later. */
export interface AccountExport {
  format: typeof EXPORT_FORMAT;
  version: typeof EXPORT_VERSION;
  exportedAt: string;
  account: { email: string | null };
  counts: { dogs: number; goals: number; entries: number };
  dogs: Row[];
  goals: Row[];
  entries: Row[];
}

export function buildExport(input: ExportInput): AccountExport {
  return {
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    exportedAt: input.exportedAt.toISOString(),
    account: { email: input.email },
    counts: { dogs: input.dogs.length, goals: input.goals.length, entries: input.entries.length },
    dogs: [...input.dogs],
    goals: [...input.goals],
    entries: [...input.entries],
  };
}

export function serializeExport(data: AccountExport): string {
  return JSON.stringify(data, null, 2);
}

/** For example "watchdog-export-2026-11-26.json", dated in the owner's local time. */
export function exportFileName(now: Date): string {
  return `${EXPORT_FORMAT}-${toLocalDateString(now)}.json`;
}

/** True only when the owner has typed the confirmation word exactly (spaces around it are ignored). */
export function isDeleteConfirmed(text: string): boolean {
  return text.trim() === DELETE_CONFIRMATION_WORD;
}

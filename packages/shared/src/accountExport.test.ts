import { describe, expect, it } from 'vitest';
import {
  buildExport,
  DELETE_CONFIRMATION_WORD,
  exportFileName,
  isDeleteConfirmed,
  serializeExport,
} from './accountExport';

const dogs = [{ id: 'd1', name: 'Pickles' }];
const goals = [{ id: 'g1', dog_id: 'd1', label: 'Daily walk' }];
const entries = [
  { id: 'e1', dog_id: 'd1', goal_id: 'g1', value: 30 },
  { id: 'e2', dog_id: 'd1', goal_id: null, value: 12 },
];
const exportedAt = new Date(Date.UTC(2026, 10, 26, 16, 30));

describe('buildExport', () => {
  it('labels the file and counts what is in it', () => {
    const data = buildExport({ exportedAt, email: 'a@example.com', dogs, goals, entries });
    expect(data.format).toBe('watchdog-export');
    expect(data.version).toBe(1);
    expect(data.exportedAt).toBe('2026-11-26T16:30:00.000Z');
    expect(data.account).toEqual({ email: 'a@example.com' });
    expect(data.counts).toEqual({ dogs: 1, goals: 1, entries: 2 });
  });

  it('keeps every row exactly as given, including entries whose goal was deleted', () => {
    const data = buildExport({ exportedAt, email: null, dogs, goals, entries });
    expect(data.dogs).toEqual(dogs);
    expect(data.goals).toEqual(goals);
    expect(data.entries).toEqual(entries);
    expect(data.account.email).toBeNull();
  });

  it('copies the lists so later changes to the inputs do not alter the export', () => {
    const rows = [{ id: 'd1' }];
    const data = buildExport({ exportedAt, email: null, dogs: rows, goals: [], entries: [] });
    rows.push({ id: 'd2' });
    expect(data.dogs).toHaveLength(1);
  });

  it('exports an empty account without errors', () => {
    const data = buildExport({ exportedAt, email: null, dogs: [], goals: [], entries: [] });
    expect(data.counts).toEqual({ dogs: 0, goals: 0, entries: 0 });
  });
});

describe('serializeExport', () => {
  it('produces readable JSON that reads back to the same data', () => {
    const data = buildExport({ exportedAt, email: 'a@example.com', dogs, goals, entries });
    const text = serializeExport(data);
    expect(text).toContain('\n  "dogs"');
    expect(JSON.parse(text)).toEqual(data);
  });
});

describe('exportFileName', () => {
  it('uses the local date', () => {
    expect(exportFileName(new Date(2026, 10, 26, 23, 59))).toBe('watchdog-export-2026-11-26.json');
    expect(exportFileName(new Date(2026, 0, 5, 0, 1))).toBe('watchdog-export-2026-01-05.json');
  });
});

describe('isDeleteConfirmed', () => {
  it('needs the exact word', () => {
    expect(DELETE_CONFIRMATION_WORD).toBe('DELETE');
    expect(isDeleteConfirmed('DELETE')).toBe(true);
    expect(isDeleteConfirmed('  DELETE  ')).toBe(true);
  });

  it.each(['', 'delete', 'Delete', 'DELET', 'DELETE ME', 'DEL ETE'])('rejects %j', (text) => {
    expect(isDeleteConfirmed(text)).toBe(false);
  });
});

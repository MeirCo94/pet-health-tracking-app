import type { DogEntry, DogGoal, EntryValues } from '@watchdog/shared';
import { supabase } from './supabase';

interface EntryRow {
  id: string;
  dog_id: string;
  goal_id: string | null;
  metric: string;
  value: number | string;
  logged_at: string;
  source: DogEntry['source'];
  note: string | null;
}

const COLUMNS = 'id, dog_id, goal_id, metric, value, logged_at, source, note';

function toEntry(row: EntryRow): DogEntry {
  return {
    id: row.id,
    dogId: row.dog_id,
    goalId: row.goal_id,
    metric: row.metric,
    // numeric columns can arrive as strings, so convert explicitly
    value: Number(row.value),
    loggedAt: row.logged_at,
    source: row.source,
    note: row.note,
  };
}

/** A dog's entries from `since` onward, newest first. */
export async function listEntriesSince(dogId: string, since: Date): Promise<DogEntry[]> {
  const { data, error } = await supabase
    .from('entries')
    .select(COLUMNS)
    .eq('dog_id', dogId)
    .gte('logged_at', since.toISOString())
    .order('logged_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data as EntryRow[]).map(toEntry);
}

/** Records a manual entry against a goal. */
export async function createEntry(goal: Pick<DogGoal, 'id' | 'dogId' | 'metric'>, values: EntryValues): Promise<DogEntry> {
  const { data, error } = await supabase
    .from('entries')
    .insert({
      dog_id: goal.dogId,
      goal_id: goal.id,
      metric: goal.metric,
      value: values.value,
      logged_at: values.loggedAt.toISOString(),
      source: 'manual',
      note: values.note,
    })
    .select(COLUMNS)
    .single();
  if (error) throw new Error(error.message);
  return toEntry(data as EntryRow);
}

export async function deleteEntry(id: string): Promise<void> {
  const { error } = await supabase.from('entries').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

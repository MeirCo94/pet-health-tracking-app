import type { DogGoal, GoalPeriod, GoalSource, GoalStatus, GoalValues } from '@watchdog/shared';
import { supabase } from './supabase';

interface GoalRow {
  id: string;
  dog_id: string;
  label: string;
  metric: string;
  unit: string | null;
  target_value: number | string;
  period: GoalPeriod;
  source: GoalSource;
  prescribed_by: string | null;
  start_date: string;
  end_date: string | null;
  status: GoalStatus;
  created_at: string;
  updated_at: string;
}

const COLUMNS =
  'id, dog_id, label, metric, unit, target_value, period, source, prescribed_by, start_date, end_date, status, created_at, updated_at';

function toGoal(row: GoalRow): DogGoal {
  return {
    id: row.id,
    dogId: row.dog_id,
    label: row.label,
    metric: row.metric,
    unit: row.unit,
    // numeric columns can arrive as strings, so convert explicitly
    targetValue: Number(row.target_value),
    period: row.period,
    source: row.source,
    prescribedBy: row.prescribed_by,
    startDate: row.start_date,
    endDate: row.end_date,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toRow(values: GoalValues) {
  return {
    label: values.label,
    metric: values.metric,
    unit: values.unit,
    target_value: values.targetValue,
    period: values.period,
    source: values.source,
    prescribed_by: values.prescribedBy,
    status: values.status,
  };
}

/** Active and paused goals for one dog, oldest first. Archived goals are left out. */
export async function listGoals(dogId: string): Promise<DogGoal[]> {
  const { data, error } = await supabase
    .from('goals')
    .select(COLUMNS)
    .eq('dog_id', dogId)
    .neq('status', 'archived')
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return (data as GoalRow[]).map(toGoal);
}

/** Returns null when the goal does not exist or belongs to someone else. */
export async function getGoal(id: string): Promise<DogGoal | null> {
  const { data, error } = await supabase.from('goals').select(COLUMNS).eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? toGoal(data as GoalRow) : null;
}

export async function createGoal(dogId: string, values: GoalValues): Promise<DogGoal> {
  const { data, error } = await supabase
    .from('goals')
    .insert({ dog_id: dogId, ...toRow(values) })
    .select(COLUMNS)
    .single();
  if (error) throw new Error(error.message);
  return toGoal(data as GoalRow);
}

export async function updateGoal(id: string, values: GoalValues): Promise<DogGoal> {
  const { data, error } = await supabase.from('goals').update(toRow(values)).eq('id', id).select(COLUMNS).single();
  if (error) throw new Error(error.message);
  return toGoal(data as GoalRow);
}

/** Entries logged against the goal are kept, with their goal link cleared. */
export async function deleteGoal(id: string): Promise<void> {
  const { error } = await supabase.from('goals').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

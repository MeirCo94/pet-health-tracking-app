export type GoalSource = 'self' | 'vet';

export interface Goal {
  id: string;
  label: string;
  target: number;
  source: GoalSource;
}

export interface Progress {
  goalId: string;
  total: number;
  target: number;
  percent: number;
  met: boolean;
}

/** Sums entry values and compares the total with the goal target. Pure and dependency-free. */
export function progressFor(goal: Goal, values: readonly number[]): Progress {
  const total = values.reduce((sum, v) => sum + (Number.isFinite(v) ? v : 0), 0);
  const percent = goal.target > 0 ? Math.min(100, Math.round((total / goal.target) * 100)) : 0;
  return {
    goalId: goal.id,
    total,
    target: goal.target,
    percent,
    met: goal.target > 0 && total >= goal.target,
  };
}

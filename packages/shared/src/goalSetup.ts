import type { GoalSource } from './goals';

export type GoalPeriod = 'daily' | 'weekly';
export type GoalStatus = 'active' | 'paused' | 'archived';

/** A goal as stored for one dog. targetValue is the minimum to reach per period. */
export interface DogGoal {
  id: string;
  dogId: string;
  label: string;
  metric: string;
  unit: string | null;
  targetValue: number;
  period: GoalPeriod;
  source: GoalSource;
  prescribedBy: string | null;
  startDate: string;
  endDate: string | null;
  status: GoalStatus;
  createdAt: string;
  updatedAt: string;
}

/** What the goal form holds: raw text, nothing parsed yet. */
export interface GoalFormInput {
  label: string;
  metric: string;
  unit: string;
  target: string;
  period: GoalPeriod;
  source: GoalSource;
  prescribedBy: string;
  status: GoalStatus;
}

/** A goal's editable fields, cleaned and ready to save. */
export interface GoalValues {
  label: string;
  metric: string;
  unit: string | null;
  targetValue: number;
  period: GoalPeriod;
  source: GoalSource;
  prescribedBy: string | null;
  status: GoalStatus;
}

export interface GoalFormErrors {
  label?: string;
  unit?: string;
  target?: string;
  prescribedBy?: string;
}

/** A ready-made activity to start a goal from. All of these are things a wearable could measure. */
export interface GoalTemplate {
  key: string;
  label: string;
  metric: string;
  unit: string;
  defaultTarget: number;
  period: GoalPeriod;
}

export const GOAL_TEMPLATES: readonly GoalTemplate[] = [
  { key: 'walk', label: 'Daily walk', metric: 'walk_minutes', unit: 'minutes', defaultTarget: 60, period: 'daily' },
  { key: 'steps', label: 'Daily steps', metric: 'steps', unit: 'steps', defaultTarget: 8000, period: 'daily' },
  { key: 'play', label: 'Active play', metric: 'play_minutes', unit: 'minutes', defaultTarget: 30, period: 'daily' },
  { key: 'sleep', label: 'Sleep', metric: 'sleep_hours', unit: 'hours', defaultTarget: 12, period: 'daily' },
  { key: 'meals', label: 'Meals', metric: 'meals', unit: 'meals', defaultTarget: 2, period: 'daily' },
  { key: 'medication', label: 'Medication doses', metric: 'medication_doses', unit: 'doses', defaultTarget: 1, period: 'daily' },
] as const;

export const MAX_GOAL_LABEL_LENGTH = 80;
export const MAX_GOAL_UNIT_LENGTH = 20;
export const MAX_PRESCRIBER_LENGTH = 120;
export const MAX_METRIC_LENGTH = 40;
export const MAX_GOAL_TARGET = 1_000_000;

/** Turns a custom goal's name into a metric key such as "custom_swim_time". */
export function customMetricFor(label: string): string {
  const slug = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return `custom_${slug || 'goal'}`.slice(0, MAX_METRIC_LENGTH).replace(/_+$/, '');
}

/** The form's starting values for a template, or for a blank custom goal when template is null. */
export function formInputFromTemplate(template: GoalTemplate | null): GoalFormInput {
  return {
    label: template?.label ?? '',
    metric: template?.metric ?? '',
    unit: template?.unit ?? '',
    target: template ? String(template.defaultTarget) : '',
    period: template?.period ?? 'daily',
    source: 'self',
    prescribedBy: '',
    status: 'active',
  };
}

/** The form's starting values for editing a saved goal. */
export function formInputFromGoal(goal: DogGoal): GoalFormInput {
  return {
    label: goal.label,
    metric: goal.metric,
    unit: goal.unit ?? '',
    target: String(goal.targetValue),
    period: goal.period,
    source: goal.source,
    prescribedBy: goal.prescribedBy ?? '',
    status: goal.status,
  };
}

/** Reads a typed number such as "8,000" or "1.5". Returns null if it is not a plain number. */
export function parseTarget(text: string): number | null {
  const cleaned = text.trim().replace(/,/g, '');
  if (!/^\d+(\.\d+)?$/.test(cleaned)) return null;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

export function validateGoal(input: GoalFormInput): GoalFormErrors {
  const errors: GoalFormErrors = {};
  const label = input.label.trim();
  const unit = input.unit.trim();
  const prescribedBy = input.prescribedBy.trim();

  if (label.length === 0) errors.label = 'Give the goal a name.';
  else if (label.length > MAX_GOAL_LABEL_LENGTH) errors.label = `Use ${MAX_GOAL_LABEL_LENGTH} characters or fewer.`;

  if (unit.length > MAX_GOAL_UNIT_LENGTH) errors.unit = `Use ${MAX_GOAL_UNIT_LENGTH} characters or fewer.`;

  const target = parseTarget(input.target);
  if (input.target.trim().length === 0) errors.target = 'Enter a target.';
  else if (target === null) errors.target = 'Enter a number, for example 60.';
  else if (target <= 0) errors.target = 'The target must be more than zero.';
  else if (target > MAX_GOAL_TARGET) errors.target = 'That number is too large.';

  if (input.source === 'vet' && prescribedBy.length > MAX_PRESCRIBER_LENGTH) {
    errors.prescribedBy = `Use ${MAX_PRESCRIBER_LENGTH} characters or fewer.`;
  }

  return errors;
}

/** Cleans form text for saving. Call only after validateGoal finds no errors. */
export function parseGoalInput(input: GoalFormInput): GoalValues {
  const label = input.label.trim();
  const unit = input.unit.trim();
  const prescribedBy = input.prescribedBy.trim();
  return {
    label,
    metric: input.metric.trim() || customMetricFor(label),
    unit: unit.length > 0 ? unit : null,
    targetValue: parseTarget(input.target) ?? 0,
    period: input.period,
    source: input.source,
    // The database only allows a prescriber on vet-set goals.
    prescribedBy: input.source === 'vet' && prescribedBy.length > 0 ? prescribedBy : null,
    status: input.status,
  };
}

/** 8000 becomes "8,000" and 1.50 becomes "1.5". */
export function formatNumber(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  const [whole = '0', fraction] = String(rounded).split('.');
  const withCommas = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return fraction ? `${withCommas}.${fraction}` : withCommas;
}

function singular(unit: string): string {
  return unit.length > 1 && unit.endsWith('s') && !unit.endsWith('ss') ? unit.slice(0, -1) : unit;
}

/** Plain-language target, such as "60 minutes per day" or "1 dose per day". */
export function formatGoalTarget(goal: Pick<DogGoal, 'targetValue' | 'unit' | 'period'>): string {
  const amount = formatNumber(goal.targetValue);
  const unit = goal.unit ? ` ${goal.targetValue === 1 ? singular(goal.unit) : goal.unit}` : '';
  return `${amount}${unit} per ${goal.period === 'daily' ? 'day' : 'week'}`;
}

/** Who set the goal, for display: "Set by you" or "Set by your vet (Dr. Lee)". */
export function describeGoalSource(goal: Pick<DogGoal, 'source' | 'prescribedBy'>): string {
  if (goal.source === 'self') return 'Set by you';
  return goal.prescribedBy ? `Set by your vet (${goal.prescribedBy})` : 'Set by your vet';
}

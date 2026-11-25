import { describe, expect, it } from 'vitest';
import {
  customMetricFor,
  describeGoalSource,
  formatGoalTarget,
  formatNumber,
  formInputFromGoal,
  formInputFromTemplate,
  GOAL_TEMPLATES,
  parseGoalInput,
  parseTarget,
  validateGoal,
  type DogGoal,
  type GoalFormInput,
} from './goalSetup';

const walk = GOAL_TEMPLATES[0]!;
const valid: GoalFormInput = formInputFromTemplate(walk);

describe('GOAL_TEMPLATES', () => {
  it('has unique keys and metrics, all with positive defaults that pass validation', () => {
    expect(new Set(GOAL_TEMPLATES.map((t) => t.key)).size).toBe(GOAL_TEMPLATES.length);
    expect(new Set(GOAL_TEMPLATES.map((t) => t.metric)).size).toBe(GOAL_TEMPLATES.length);
    for (const t of GOAL_TEMPLATES) {
      expect(validateGoal(formInputFromTemplate(t))).toEqual({});
    }
  });
});

describe('formInputFromTemplate', () => {
  it('fills the form from a template, owner-set and active', () => {
    expect(formInputFromTemplate(walk)).toEqual({
      label: 'Daily walk',
      metric: 'walk_minutes',
      unit: 'minutes',
      target: '60',
      period: 'daily',
      source: 'self',
      prescribedBy: '',
      status: 'active',
    });
  });

  it('starts a custom goal blank', () => {
    const blank = formInputFromTemplate(null);
    expect(blank.label).toBe('');
    expect(blank.metric).toBe('');
    expect(blank.target).toBe('');
  });
});

describe('customMetricFor', () => {
  it('makes a safe key from the name', () => {
    expect(customMetricFor('Swim time!')).toBe('custom_swim_time');
    expect(customMetricFor('  Fetch / frisbee  ')).toBe('custom_fetch_frisbee');
  });

  it('falls back when the name has no letters or digits', () => {
    expect(customMetricFor('!!!')).toBe('custom_goal');
  });

  it('stays within the database length limit', () => {
    const metric = customMetricFor('a'.repeat(100));
    expect(metric.length).toBeLessThanOrEqual(40);
    expect(metric.endsWith('_')).toBe(false);
  });
});

describe('parseTarget', () => {
  it.each([
    ['60', 60],
    [' 1.5 ', 1.5],
    ['8,000', 8000],
    ['0', 0],
    ['1,5', 1.5],
    ['0,25', 0.25],
    ['12,34', 12.34],
    ['1,500', 1500],
    ['1,234,567', 1234567],
    ['1,500.5', 1500.5],
  ])('reads %s', (text, expected) => {
    expect(parseTarget(text)).toBe(expected);
  });

  it.each(['', 'abc', '-5', '1e3', '1.', '.5', '5 minutes', '1.2.3', '0.004', '1,2345', '1,5,0', '12,34,5', ',5', '1,000,00'])('rejects %s', (text) => {
    expect(parseTarget(text)).toBeNull();
  });
});

describe('validateGoal', () => {
  it('saves a decimal comma as a decimal, not as a larger whole number', () => {
    expect(validateGoal({ ...valid, target: '1,5' })).toEqual({});
    expect(parseGoalInput({ ...valid, target: '1,5' }).targetValue).toBe(1.5);
  });

  it('rejects targets with more decimal places than can be shown', () => {
    expect(validateGoal({ ...valid, target: '0.004' }).target).toMatch(/decimal places/);
    expect(validateGoal({ ...valid, target: '1,2345' }).target).toMatch(/decimal places/);
    expect(validateGoal({ ...valid, target: 'abc' }).target).toMatch(/number/);
  });

  it('accepts a template goal', () => {
    expect(validateGoal(valid)).toEqual({});
  });

  it('requires a name', () => {
    expect(validateGoal({ ...valid, label: '  ' }).label).toMatch(/name/);
  });

  it('limits name, unit and prescriber length', () => {
    expect(validateGoal({ ...valid, label: 'x'.repeat(81) }).label).toMatch(/80/);
    expect(validateGoal({ ...valid, unit: 'x'.repeat(21) }).unit).toMatch(/20/);
    expect(validateGoal({ ...valid, source: 'vet', prescribedBy: 'x'.repeat(121) }).prescribedBy).toMatch(/120/);
  });

  it('ignores a long prescriber on a self-set goal because it will not be saved', () => {
    expect(validateGoal({ ...valid, source: 'self', prescribedBy: 'x'.repeat(500) })).toEqual({});
  });

  it('checks the target', () => {
    expect(validateGoal({ ...valid, target: '' }).target).toMatch(/Enter a target/);
    expect(validateGoal({ ...valid, target: 'lots' }).target).toMatch(/number/);
    expect(validateGoal({ ...valid, target: '0' }).target).toMatch(/more than zero/);
    expect(validateGoal({ ...valid, target: '1000001' }).target).toMatch(/too large/);
    expect(validateGoal({ ...valid, target: '1000000' })).toEqual({});
  });
});

describe('parseGoalInput', () => {
  it('cleans a template goal', () => {
    expect(parseGoalInput(valid)).toEqual({
      label: 'Daily walk',
      metric: 'walk_minutes',
      unit: 'minutes',
      targetValue: 60,
      period: 'daily',
      source: 'self',
      prescribedBy: null,
      status: 'active',
    });
  });

  it('derives a metric for a custom goal and turns a blank unit into null', () => {
    const values = parseGoalInput({ ...formInputFromTemplate(null), label: ' Swim time ', target: '15', unit: ' ' });
    expect(values.metric).toBe('custom_swim_time');
    expect(values.unit).toBeNull();
    expect(values.label).toBe('Swim time');
  });

  it('keeps the prescriber on vet goals and drops it on self goals', () => {
    expect(parseGoalInput({ ...valid, source: 'vet', prescribedBy: ' Dr. Lee ' }).prescribedBy).toBe('Dr. Lee');
    expect(parseGoalInput({ ...valid, source: 'vet', prescribedBy: '  ' }).prescribedBy).toBeNull();
    expect(parseGoalInput({ ...valid, source: 'self', prescribedBy: 'Dr. Lee' }).prescribedBy).toBeNull();
  });

  it('reads comma-separated targets', () => {
    expect(parseGoalInput({ ...valid, target: '8,000' }).targetValue).toBe(8000);
  });
});

describe('formatNumber', () => {
  it.each([
    [60, '60'],
    [8000, '8,000'],
    [1234567, '1,234,567'],
    [1.5, '1.5'],
    [2.456, '2.46'],
    [0.5, '0.5'],
  ])('formats %s as %s', (value, expected) => {
    expect(formatNumber(value)).toBe(expected);
  });
});

describe('formatGoalTarget', () => {
  it('reads naturally for daily and weekly goals', () => {
    expect(formatGoalTarget({ targetValue: 60, unit: 'minutes', period: 'daily' })).toBe('60 minutes per day');
    expect(formatGoalTarget({ targetValue: 5, unit: 'walks', period: 'weekly' })).toBe('5 walks per week');
    expect(formatGoalTarget({ targetValue: 8000, unit: 'steps', period: 'daily' })).toBe('8,000 steps per day');
  });

  it('uses the singular unit for exactly one', () => {
    expect(formatGoalTarget({ targetValue: 1, unit: 'doses', period: 'daily' })).toBe('1 dose per day');
    expect(formatGoalTarget({ targetValue: 1, unit: 'glass', period: 'daily' })).toBe('1 glass per day');
    expect(formatGoalTarget({ targetValue: 1, unit: 'ss', period: 'daily' })).toBe('1 ss per day');
  });

  it('works without a unit', () => {
    expect(formatGoalTarget({ targetValue: 3, unit: null, period: 'weekly' })).toBe('3 per week');
  });
});

describe('describeGoalSource', () => {
  it('says who set the goal', () => {
    expect(describeGoalSource({ source: 'self', prescribedBy: null })).toBe('Set by you');
    expect(describeGoalSource({ source: 'vet', prescribedBy: null })).toBe('Set by your vet');
    expect(describeGoalSource({ source: 'vet', prescribedBy: 'Dr. Lee' })).toBe('Set by your vet (Dr. Lee)');
  });
});

describe('formInputFromGoal', () => {
  const saved: DogGoal = {
    id: 'g1',
    dogId: 'd1',
    label: 'Medication',
    metric: 'medication_doses',
    unit: null,
    targetValue: 2.5,
    period: 'weekly',
    source: 'vet',
    prescribedBy: 'Dr. Lee',
    startDate: '2026-11-18',
    endDate: null,
    status: 'paused',
    createdAt: '2026-11-18T10:00:00Z',
    updatedAt: '2026-11-18T10:00:00Z',
  };

  it('turns a saved goal back into form text', () => {
    expect(formInputFromGoal(saved)).toEqual({
      label: 'Medication',
      metric: 'medication_doses',
      unit: '',
      target: '2.5',
      period: 'weekly',
      source: 'vet',
      prescribedBy: 'Dr. Lee',
      status: 'paused',
    });
  });

  it('round-trips through validation and parsing', () => {
    const input = formInputFromGoal(saved);
    expect(validateGoal(input)).toEqual({});
    expect(parseGoalInput(input)).toMatchObject({ metric: 'medication_doses', targetValue: 2.5, prescribedBy: 'Dr. Lee', status: 'paused' });
  });
});

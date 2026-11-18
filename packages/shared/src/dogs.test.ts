import { describe, expect, it } from 'vitest';
import { formatAge, parseDogInput, toLocalDateString, validateDog } from './dogs';

// 18 November 2026, local time
const today = new Date(2026, 10, 18);
const valid = { name: 'Pickles', breed: 'Beagle', birthDate: '2021-04-18' };

describe('validateDog', () => {
  it('accepts a complete dog', () => {
    expect(validateDog(valid, today)).toEqual({});
  });

  it('accepts a dog with only a name', () => {
    expect(validateDog({ name: 'Pickles', breed: '', birthDate: '' }, today)).toEqual({});
  });

  it('requires a name', () => {
    expect(validateDog({ ...valid, name: '   ' }, today).name).toMatch(/Enter your dog/);
  });

  it('limits name and breed length', () => {
    expect(validateDog({ ...valid, name: 'x'.repeat(81) }, today).name).toMatch(/80/);
    expect(validateDog({ ...valid, breed: 'x'.repeat(81) }, today).breed).toMatch(/80/);
    expect(validateDog({ ...valid, name: 'x'.repeat(80) }, today)).toEqual({});
  });

  it.each(['18/04/2021', '2021-4-18', '2021-04-18T00:00', 'last spring'])('rejects the date format %s', (birthDate) => {
    expect(validateDog({ ...valid, birthDate }, today).birthDate).toMatch(/YYYY-MM-DD/);
  });

  it.each(['2021-02-30', '2021-13-01', '2021-00-10', '2023-02-29'])('rejects the impossible date %s', (birthDate) => {
    expect(validateDog({ ...valid, birthDate }, today).birthDate).toMatch(/YYYY-MM-DD/);
  });

  it('accepts a real leap day', () => {
    expect(validateDog({ ...valid, birthDate: '2024-02-29' }, today)).toEqual({});
  });

  it('rejects a future date but allows today', () => {
    expect(validateDog({ ...valid, birthDate: '2026-11-19' }, today).birthDate).toMatch(/future/);
    expect(validateDog({ ...valid, birthDate: '2026-11-18' }, today)).toEqual({});
  });

  it('rejects an implausibly old birth year', () => {
    expect(validateDog({ ...valid, birthDate: '1980-01-01' }, today).birthDate).toMatch(/old dog/);
    expect(validateDog({ ...valid, birthDate: '1986-01-01' }, today)).toEqual({});
  });
});

describe('parseDogInput', () => {
  it('trims text and turns blanks into null', () => {
    expect(parseDogInput({ name: '  Pickles ', breed: '  ', birthDate: ' ' })).toEqual({
      name: 'Pickles',
      breed: null,
      birthDate: null,
    });
  });

  it('keeps filled optional fields', () => {
    expect(parseDogInput(valid)).toEqual({ name: 'Pickles', breed: 'Beagle', birthDate: '2021-04-18' });
  });
});

describe('formatAge', () => {
  it('returns null when there is no usable birth date', () => {
    expect(formatAge(null, today)).toBeNull();
    expect(formatAge('nonsense', today)).toBeNull();
    expect(formatAge('2027-01-01', today)).toBeNull();
  });

  it('shows years from two years up', () => {
    expect(formatAge('2021-04-18', today)).toBe('5 years');
    expect(formatAge('2024-11-18', today)).toBe('2 years');
  });

  it('shows months under two years', () => {
    expect(formatAge('2025-11-18', today)).toBe('12 months');
    expect(formatAge('2026-06-10', today)).toBe('5 months');
    expect(formatAge('2026-10-18', today)).toBe('1 month');
  });

  it('does not count a month until the day of the month is reached', () => {
    expect(formatAge('2026-10-19', today)).toBe('Under 1 month');
    expect(formatAge('2026-11-01', today)).toBe('Under 1 month');
  });

  it('rolls over to the next year on the birthday', () => {
    expect(formatAge('2021-11-18', today)).toBe('5 years');
    expect(formatAge('2021-11-19', today)).toBe('4 years');
  });
});

describe('toLocalDateString', () => {
  it('pads month and day', () => {
    expect(toLocalDateString(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

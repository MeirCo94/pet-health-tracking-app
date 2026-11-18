import { describe, expect, it } from 'vitest';
import { MIN_PASSWORD_LENGTH, normalizeEmail, validateCredentials } from './auth';

describe('normalizeEmail', () => {
  it('trims and lowercases', () => {
    expect(normalizeEmail('  Ana@Example.COM ')).toBe('ana@example.com');
  });
});

describe('validateCredentials', () => {
  it('accepts a valid sign-up', () => {
    expect(validateCredentials({ email: 'ana@example.com', password: 'longenough' }, 'sign-up')).toEqual({});
  });

  it('asks for an email and password when both are empty', () => {
    const errors = validateCredentials({ email: '  ', password: '' }, 'sign-in');
    expect(errors.email).toMatch(/Enter your email/);
    expect(errors.password).toMatch(/Enter your password/);
  });

  it.each(['ana', 'ana@', '@example.com', 'ana@example', 'a na@example.com'])('rejects the malformed email %s', (email) => {
    expect(validateCredentials({ email, password: 'longenough' }, 'sign-in').email).toMatch(/valid email/);
  });

  it('enforces the minimum length on sign-up only', () => {
    const short = 'x'.repeat(MIN_PASSWORD_LENGTH - 1);
    expect(validateCredentials({ email: 'ana@example.com', password: short }, 'sign-up').password).toMatch(/at least 8/);
    expect(validateCredentials({ email: 'ana@example.com', password: short }, 'sign-in')).toEqual({});
  });

  it('accepts a password of exactly the minimum length', () => {
    const exact = 'x'.repeat(MIN_PASSWORD_LENGTH);
    expect(validateCredentials({ email: 'ana@example.com', password: exact }, 'sign-up')).toEqual({});
  });
});

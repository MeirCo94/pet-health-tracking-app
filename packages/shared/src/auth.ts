export const MIN_PASSWORD_LENGTH = 8;

export type AuthMode = 'sign-in' | 'sign-up';

export interface Credentials {
  email: string;
  password: string;
}

export interface CredentialErrors {
  email?: string;
  password?: string;
}

/** Trims and lowercases an email so the same address is always sent the same way. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Checks the sign-in or sign-up form before anything is sent.
 * Sign-in only needs a password to be present, so people with older, shorter passwords can still get in.
 * Sign-up enforces the minimum length.
 */
export function validateCredentials(input: Credentials, mode: AuthMode): CredentialErrors {
  const errors: CredentialErrors = {};
  const email = normalizeEmail(input.email);

  if (email.length === 0) {
    errors.email = 'Enter your email address.';
  } else if (!EMAIL_SHAPE.test(email)) {
    errors.email = 'Enter a valid email address.';
  }

  if (input.password.length === 0) {
    errors.password = 'Enter your password.';
  } else if (mode === 'sign-up' && input.password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
  }

  return errors;
}

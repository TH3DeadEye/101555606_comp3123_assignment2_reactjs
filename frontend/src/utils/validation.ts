import type { LoginPayload } from '../api/types';

// Client-side checks. They mirror the backend's rules so people get instant
// feedback, but they are only a convenience: the backend validates everything
// again and is the source of truth.

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_PATTERN = /^[A-Za-z0-9._-]+$/;

export function validateUsername(value: string): string | null {
  const username = value.trim();
  if (!username) return 'Username is required.';
  if (username.length < 3) return 'Username must be at least 3 characters.';
  if (username.length > 30) return 'Username must be at most 30 characters.';
  if (!USERNAME_PATTERN.test(username)) {
    return 'Username can only contain letters, numbers, dots, underscores and hyphens.';
  }
  return null;
}

export function validateEmail(value: string): string | null {
  const email = value.trim();
  if (!email) return 'Email is required.';
  if (email.length > 254) return 'Email must be at most 254 characters.';
  if (!EMAIL_PATTERN.test(email)) return 'Enter a valid email address.';
  return null;
}

// ---- Password ---------------------------------------------------------------

export interface PasswordRequirement {
  id: 'length' | 'lowercase' | 'uppercase' | 'number' | 'special';
  label: string;
  met: boolean;
}

// bcrypt only reads the first 72 bytes, so the backend refuses longer passwords.
const byteLength = (value: string) => new TextEncoder().encode(value).length;

export function passwordRequirements(password: string): PasswordRequirement[] {
  return [
    { id: 'length', label: 'At least 8 characters', met: password.length >= 8 },
    { id: 'lowercase', label: 'A lowercase letter', met: /[a-z]/.test(password) },
    { id: 'uppercase', label: 'An uppercase letter', met: /[A-Z]/.test(password) },
    { id: 'number', label: 'A number', met: /[0-9]/.test(password) },
    { id: 'special', label: 'A special character, such as ! or #', met: /[^A-Za-z0-9]/.test(password) },
  ];
}

const REQUIREMENT_MESSAGES: Record<PasswordRequirement['id'], string> = {
  length: 'Password must be at least 8 characters.',
  lowercase: 'Password must contain a lowercase letter.',
  uppercase: 'Password must contain an uppercase letter.',
  number: 'Password must contain a number.',
  special: 'Password must contain a special character.',
};

export function validatePassword(password: string): string | null {
  if (!password) return 'Password is required.';
  if (byteLength(password) > 72) return 'Password must be at most 72 bytes.';
  const unmet = passwordRequirements(password).find((requirement) => !requirement.met);
  return unmet ? REQUIREMENT_MESSAGES[unmet.id] : null;
}

export function validateConfirmPassword(password: string, confirmation: string): string | null {
  if (!confirmation) return 'Please repeat the password.';
  if (confirmation !== password) return 'The passwords do not match.';
  return null;
}

// ---- Login ------------------------------------------------------------------

// The login form accepts a username or an email in one box. Login does not
// check the password rules, so old passwords keep working.
export function validateLoginIdentifier(value: string): string | null {
  const identifier = value.trim();
  if (!identifier) return 'Enter your username or email address.';
  if (identifier.length > 254) return 'That is too long to be a username or an email address.';
  return null;
}

export function validateLoginPassword(value: string): string | null {
  return value ? null : 'Enter your password.';
}

// Something with an @ is sent as an email, anything else as a username.
export function buildLoginPayload(identifier: string, password: string): LoginPayload {
  const value = identifier.trim();
  return value.includes('@') ? { email: value, password } : { username: value, password };
}

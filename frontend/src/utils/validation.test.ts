import { describe, expect, it } from 'vitest';
import {
  buildLoginPayload,
  passwordRequirements,
  validateConfirmPassword,
  validateEmail,
  validateLoginIdentifier,
  validateLoginPassword,
  validatePassword,
  validateUsername,
} from './validation';

describe('validateUsername', () => {
  it('accepts letters, numbers, dots, underscores and hyphens', () => {
    for (const ok of ['alice', 'Alice_01', 'a.b-c', 'abc', 'x'.repeat(30)]) expect(validateUsername(ok)).toBeNull();
  });

  it('explains what is wrong', () => {
    expect(validateUsername('')).toBe('Username is required.');
    expect(validateUsername('   ')).toBe('Username is required.');
    expect(validateUsername('ab')).toBe('Username must be at least 3 characters.');
    expect(validateUsername('x'.repeat(31))).toBe('Username must be at most 30 characters.');
    expect(validateUsername('bad name!')).toMatch(/can only contain/);
  });

  it('ignores spaces around the value, like the backend does', () => {
    expect(validateUsername('  alice  ')).toBeNull();
  });
});

describe('validateEmail', () => {
  it('accepts normal addresses', () => {
    for (const ok of ['a@b.co', 'first.last+tag@example.com', ' spaced@example.com ']) expect(validateEmail(ok)).toBeNull();
  });

  it('rejects the usual mistakes', () => {
    expect(validateEmail('')).toBe('Email is required.');
    for (const bad of ['nope', 'a@b', '@example.com', 'a@@b.com', 'a b@c.com']) {
      expect(validateEmail(bad)).toBe('Enter a valid email address.');
    }
    expect(validateEmail(`${'a'.repeat(250)}@b.co`)).toMatch(/at most 254/);
  });
});

describe('passwords', () => {
  it('reports each requirement separately for the live checklist', () => {
    const state = Object.fromEntries(passwordRequirements('abc').map((r) => [r.id, r.met]));
    expect(state).toEqual({ length: false, lowercase: true, uppercase: false, number: false, special: false });

    expect(passwordRequirements('Str0ng!Pass').every((r) => r.met)).toBe(true);
  });

  it('accepts a password that meets every rule', () => {
    expect(validatePassword('Str0ng!Pass')).toBeNull();
  });

  it('names the first unmet rule', () => {
    expect(validatePassword('')).toBe('Password is required.');
    expect(validatePassword('Sh0rt!')).toBe('Password must be at least 8 characters.');
    expect(validatePassword('ALLUPPER1!')).toBe('Password must contain a lowercase letter.');
    expect(validatePassword('alllower1!')).toBe('Password must contain an uppercase letter.');
    expect(validatePassword('NoNumber!!')).toBe('Password must contain a number.');
    expect(validatePassword('NoSpecial12')).toBe('Password must contain a special character.');
  });

  it('refuses passwords longer than bcrypt can use (72 bytes, not characters)', () => {
    expect(validatePassword('Aa1!' + 'x'.repeat(68))).toBeNull(); // exactly 72 bytes
    expect(validatePassword('Aa1!' + 'x'.repeat(69))).toBe('Password must be at most 72 bytes.');
    expect(validatePassword('Aa1!' + 'é'.repeat(35))).toBe('Password must be at most 72 bytes.'); // 74 bytes in 39 characters
  });

  it('checks the confirmation', () => {
    expect(validateConfirmPassword('Str0ng!Pass', '')).toBe('Please repeat the password.');
    expect(validateConfirmPassword('Str0ng!Pass', 'Str0ng!Pas')).toBe('The passwords do not match.');
    expect(validateConfirmPassword('Str0ng!Pass', 'Str0ng!Pass')).toBeNull();
  });
});

describe('login form', () => {
  it('needs a username or email and a password', () => {
    expect(validateLoginIdentifier('')).toBe('Enter your username or email address.');
    expect(validateLoginIdentifier('alice')).toBeNull();
    expect(validateLoginPassword('')).toBe('Enter your password.');
    expect(validateLoginPassword('anything')).toBeNull();
  });

  it('does NOT apply the signup password rules (old passwords must keep working)', () => {
    expect(validateLoginPassword('weak')).toBeNull();
  });

  it('sends an email when the text contains @, otherwise a username', () => {
    expect(buildLoginPayload(' alice@example.com ', 'pw')).toEqual({ email: 'alice@example.com', password: 'pw' });
    expect(buildLoginPayload(' alice ', 'pw')).toEqual({ username: 'alice', password: 'pw' });
  });
});

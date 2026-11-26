import { describe, expect, it } from 'vitest';
import { API_ORIGIN } from '../api/client';
import { formatDate, formatDateTime, formatSalary, fullName, resolvePictureUrl, toDateInputValue } from './format';

describe('formatDate', () => {
  it('shows the calendar date that was stored, whatever the viewer time zone is', () => {
    expect(formatDate('2024-03-01T00:00:00.000Z')).toBe('Mar 1, 2024');
    expect(formatDate('2023-12-31T00:00:00.000Z')).toBe('Dec 31, 2023');
    expect(formatDate('2024-01-01T00:00:00.000Z')).toBe('Jan 1, 2024');
  });

  it('does not crash on a bad value', () => {
    expect(formatDate('not a date')).toBe('—');
    expect(formatDate('')).toBe('—');
  });
});

describe('formatDateTime', () => {
  it('includes the time and survives a bad value', () => {
    expect(formatDateTime('2026-01-15T15:30:00.000Z')).toMatch(/2026/);
    expect(formatDateTime('nope')).toBe('—');
  });
});

describe('formatSalary', () => {
  it('uses dollars with thousands separators and cents', () => {
    expect(formatSalary(85000)).toBe('$85,000.00');
    expect(formatSalary(60000.5)).toBe('$60,000.50');
    expect(formatSalary(1234567.89)).toBe('$1,234,567.89');
  });

  it('does not crash on a bad value', () => {
    expect(formatSalary(Number.NaN)).toBe('—');
  });
});

describe('toDateInputValue', () => {
  it('returns the UTC calendar date for a date input', () => {
    expect(toDateInputValue('2024-03-01T00:00:00.000Z')).toBe('2024-03-01');
    expect(toDateInputValue('2024-03-01')).toBe('2024-03-01');
    expect(toDateInputValue('garbage')).toBe('');
  });
});

describe('fullName', () => {
  it('joins first and last name', () => {
    expect(fullName({ first_name: 'Jane', last_name: 'Doe' })).toBe('Jane Doe');
  });
});

describe('resolvePictureUrl', () => {
  it('points stored paths at the backend, not at the frontend', () => {
    expect(resolvePictureUrl('/uploads/abc.png')).toBe(`${API_ORIGIN}/uploads/abc.png`);
    expect(resolvePictureUrl('uploads/abc.png')).toBe(`${API_ORIGIN}/uploads/abc.png`);
  });

  it('leaves full URLs alone (cloud storage)', () => {
    expect(resolvePictureUrl('https://cdn.example.com/a.png')).toBe('https://cdn.example.com/a.png');
  });

  it('returns null when there is no picture', () => {
    expect(resolvePictureUrl(null)).toBeNull();
    expect(resolvePictureUrl(undefined)).toBeNull();
    expect(resolvePictureUrl('')).toBeNull();
  });
});

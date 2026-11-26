import { describe, expect, it } from 'vitest';
import type { EmployeeInput } from '../api/types';
import {
  MAX_PICTURE_BYTES,
  validateEmployeeInput,
  validateJoinDate,
  validateLabel,
  validateName,
  validatePicture,
  validateSalary,
} from './employeeValidation';

const file = (type: string, size = 1000) => new File([new Uint8Array(size)], 'x', { type });

describe('validateName', () => {
  it('accepts names from many languages', () => {
    for (const ok of ['Jane', 'Anne-Marie', "O'Brien", 'José', 'Müller-O’Neil', 'Dr. Who', '李小龍']) {
      expect(validateName('First name', ok)).toBeNull();
    }
  });

  it('rejects empty, too long and unsafe names', () => {
    expect(validateName('First name', '   ')).toBe('First name is required.');
    expect(validateName('Last name', 'x'.repeat(51))).toBe('Last name must be at most 50 characters.');
    expect(validateName('First name', '<script>alert(1)</script>')).toMatch(/can only contain letters/);
    expect(validateName('First name', 'Jane2')).toMatch(/can only contain letters/);
    expect(validateName('First name', '-Jane')).toMatch(/can only contain letters/);
  });
});

describe('validateLabel (position / department)', () => {
  it('accepts common punctuation', () => {
    for (const ok of ['IT', 'R&D', 'Sales/Marketing', 'C++ Developer', 'Software Engineer II', 'Dev (Core)']) {
      expect(validateLabel('Position', ok)).toBeNull();
    }
  });

  it('rejects the rest', () => {
    expect(validateLabel('Department', '')).toBe('Department is required.');
    expect(validateLabel('Department', 'x')).toBe('Department must be at least 2 characters.');
    expect(validateLabel('Position', 'x'.repeat(101))).toBe('Position must be at most 100 characters.');
    expect(validateLabel('Position', 'IT; DROP TABLE')).toBe('Position contains characters that are not allowed.');
  });
});

describe('validateSalary', () => {
  it('accepts whole numbers and up to two decimals', () => {
    for (const ok of ['55000', '55000.5', '55000.50', ' 85000 ', '0.01', '10000000']) expect(validateSalary(ok)).toBeNull();
  });

  it('explains each problem', () => {
    expect(validateSalary('')).toBe('Salary is required.');
    expect(validateSalary('abc')).toMatch(/must be a number/);
    expect(validateSalary('1e5')).toMatch(/must be a number/);
    expect(validateSalary('55,000')).toMatch(/must be a number/);
    expect(validateSalary('0')).toBe('Salary must be greater than 0.');
    expect(validateSalary('-5')).toBe('Salary must be greater than 0.');
    expect(validateSalary('12.345')).toBe('Salary can have at most 2 decimal places.');
    expect(validateSalary('10000001')).toBe('Salary must be at most 10,000,000.');
  });
});

describe('validateJoinDate', () => {
  const now = new Date('2026-06-15T12:00:00Z');

  it('accepts real dates in range, including near-future start dates', () => {
    for (const ok of ['2024-03-01', '1950-01-01', '2026-06-15', '2027-06-01', '2024-02-29']) expect(validateJoinDate(ok, now)).toBeNull();
  });

  it('rejects missing and malformed dates', () => {
    expect(validateJoinDate('', now)).toBe('Date of joining is required.');
    for (const bad of ['yesterday', '2024/03/01', '03-01-2024', '2024-3-1']) {
      expect(validateJoinDate(bad, now)).toBe('Date of joining must be a valid date (YYYY-MM-DD).');
    }
  });

  it('rejects dates that do not exist instead of rolling them over', () => {
    expect(validateJoinDate('2024-02-31', now)).toBe('Date of joining must be a valid date (YYYY-MM-DD).');
    expect(validateJoinDate('2023-02-29', now)).toBe('Date of joining must be a valid date (YYYY-MM-DD).'); // not a leap year
    expect(validateJoinDate('2024-13-01', now)).toBe('Date of joining must be a valid date (YYYY-MM-DD).');
  });

  it('rejects dates that are too old or too far ahead', () => {
    expect(validateJoinDate('1949-12-31', now)).toMatch(/between 1950 and one year/);
    expect(validateJoinDate('2028-01-01', now)).toMatch(/between 1950 and one year/);
  });
});

describe('validatePicture', () => {
  it('a picture is optional', () => {
    expect(validatePicture(null)).toBeNull();
  });

  it('accepts JPEG, PNG and WebP up to 2 MB, including exactly 2 MB', () => {
    expect(validatePicture(file('image/jpeg'))).toBeNull();
    expect(validatePicture(file('image/png'))).toBeNull();
    expect(validatePicture(file('image/webp'))).toBeNull();
    expect(validatePicture(file('image/png', MAX_PICTURE_BYTES))).toBeNull();
  });

  it('rejects other file types', () => {
    for (const type of ['image/gif', 'image/svg+xml', 'application/pdf', 'text/plain', '']) {
      expect(validatePicture(file(type))).toBe('Only JPEG, PNG and WebP pictures are allowed.');
    }
  });

  it('rejects a file over 2 MB and says how big it is', () => {
    expect(validatePicture(file('image/png', MAX_PICTURE_BYTES + 1))).toBe('The picture is too large (2.0 MB). The maximum size is 2 MB.');
    expect(validatePicture(file('image/png', 5 * 1024 * 1024))).toMatch(/\(5\.0 MB\)/);
  });
});

describe('validateEmployeeInput', () => {
  const valid: EmployeeInput = {
    first_name: 'Jane', last_name: 'Doe', email: 'jane@example.com', position: 'Engineer',
    department: 'Engineering', salary: '85000', date_of_joining: '2024-03-01',
  };

  it('returns nothing for a valid form', () => {
    expect(validateEmployeeInput(valid)).toEqual({});
  });

  it('returns a message for each invalid field only', () => {
    const errors = validateEmployeeInput({ ...valid, first_name: '', email: 'nope', salary: '-1' });
    expect(Object.keys(errors).sort()).toEqual(['email', 'first_name', 'salary']);
  });
});

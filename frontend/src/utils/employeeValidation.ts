import type { EmployeeInput } from '../api/types';
import { validateEmail } from './validation';

// Client-side copies of the backend's employee rules (instant feedback only;
// the backend validates everything again).

// Letters from any language, plus spaces, dots, apostrophes and hyphens.
const NAME_PATTERN = /^\p{L}[\p{L}\p{M} .'’-]*$/u;
// Letters, numbers and common punctuation (R&D, Sales/Marketing, C++ Developer).
const LABEL_PATTERN = /^[\p{L}\p{N}][\p{L}\p{N}\p{M} &/.,'’()+#-]*$/u;

export function validateName(label: 'First name' | 'Last name', value: string): string | null {
  const name = value.trim();
  if (!name) return `${label} is required.`;
  if (name.length > 50) return `${label} must be at most 50 characters.`;
  if (!NAME_PATTERN.test(name)) return `${label} can only contain letters, spaces, dots, apostrophes and hyphens.`;
  return null;
}

export function validateLabel(label: 'Position' | 'Department', value: string): string | null {
  const text = value.trim();
  if (!text) return `${label} is required.`;
  if (text.length < 2) return `${label} must be at least 2 characters.`;
  if (text.length > 100) return `${label} must be at most 100 characters.`;
  if (!LABEL_PATTERN.test(text)) return `${label} contains characters that are not allowed.`;
  return null;
}

export function validateSalary(value: string): string | null {
  const text = value.trim();
  if (!text) return 'Salary is required.';
  if (!/^-?\d+(\.\d+)?$/.test(text)) return 'Salary must be a number, for example 55000 or 55000.50.';

  const amount = Number(text);
  if (amount <= 0) return 'Salary must be greater than 0.';
  if (amount > 10_000_000) return 'Salary must be at most 10,000,000.';
  if (Math.round(amount * 100) / 100 !== amount) return 'Salary can have at most 2 decimal places.';
  return null;
}

const INVALID_DATE = 'Date of joining must be a valid date (YYYY-MM-DD).';

export function validateJoinDate(value: string, now: Date = new Date()): string | null {
  if (!value) return 'Date of joining is required.';

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return INVALID_DATE;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];

  // 2024-02-31 would silently roll over to March 2, so check it survives a round trip.
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return INVALID_DATE;

  const oneYearAhead = now.getTime() + 366 * 24 * 60 * 60 * 1000;
  if (year < 1950 || date.getTime() > oneYearAhead) return 'Date of joining must be between 1950 and one year from today.';
  return null;
}

// ---- Profile picture ----------------------------------------------------------

export const PICTURE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_PICTURE_BYTES = 2 * 1024 * 1024; // 2 MB, the same limit as the backend

function formatMegabytes(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function validatePicture(file: File | null): string | null {
  if (!file) return null; // a picture is optional
  if (!PICTURE_TYPES.includes(file.type)) return 'Only JPEG, PNG and WebP pictures are allowed.';
  if (file.size > MAX_PICTURE_BYTES) {
    return `The picture is too large (${formatMegabytes(file.size)}). The maximum size is 2 MB.`;
  }
  return null;
}

// ---- The whole form ------------------------------------------------------------

export type EmployeeFieldErrors = Partial<Record<keyof EmployeeInput, string>>;

// Only the fields that have a problem are present in the result.
export function validateEmployeeInput(input: EmployeeInput): EmployeeFieldErrors {
  const checks: [keyof EmployeeInput, string | null][] = [
    ['first_name', validateName('First name', input.first_name)],
    ['last_name', validateName('Last name', input.last_name)],
    ['email', validateEmail(input.email)],
    ['position', validateLabel('Position', input.position)],
    ['department', validateLabel('Department', input.department)],
    ['salary', validateSalary(input.salary)],
    ['date_of_joining', validateJoinDate(input.date_of_joining)],
  ];
  const errors: EmployeeFieldErrors = {};
  for (const [field, message] of checks) if (message) errors[field] = message;
  return errors;
}

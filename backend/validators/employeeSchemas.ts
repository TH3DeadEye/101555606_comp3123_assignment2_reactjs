import { z } from 'zod';
import { emailField, objectIdField, requiredText } from './common';

// Letters from any language, plus spaces, dots, apostrophes and hyphens
// (O'Brien, Anne-Marie, José). Anything like <script> is rejected.
const nameField = (label: string) =>
  requiredText(label)
    .trim()
    // abort: stop at this message instead of also reporting the pattern error
    .min(1, { error: `${label} is required.`, abort: true })
    .max(50, `${label} must be at most 50 characters.`)
    .regex(
      /^\p{L}[\p{L}\p{M} .'’-]*$/u,
      `${label} can only contain letters, spaces, dots, apostrophes and hyphens.`,
    );

// Used for position and department: letters, numbers and common punctuation
// (R&D, Sales/Marketing, Software Engineer II, C++ Developer).
const labelField = (label: string) =>
  requiredText(label)
    .trim()
    .min(1, { error: `${label} is required.`, abort: true })
    .min(2, { error: `${label} must be at least 2 characters.`, abort: true })
    .max(100, `${label} must be at most 100 characters.`)
    .regex(
      /^[\p{L}\p{N}][\p{L}\p{N}\p{M} &/.,'’()+#-]*$/u,
      `${label} contains characters that are not allowed.`,
    );

// multipart/form-data sends every value as text, so a salary may arrive as the
// string "55000.50" as well as the number 55000.5. Anything else is rejected.
const SALARY_FORMAT_MESSAGE = 'Salary must be a number, for example 55000 or 55000.50.';

const salaryField = z
  .union([z.number(), requiredText('Salary').trim().regex(/^-?\d+(\.\d+)?$/, SALARY_FORMAT_MESSAGE)], {
    error: (issue) => (issue.input === undefined ? 'Salary is required.' : SALARY_FORMAT_MESSAGE),
  })
  .transform((value) => Number(value))
  .pipe(
    z
      .number()
      .positive('Salary must be greater than 0.')
      .max(10_000_000, 'Salary must be at most 10,000,000.')
      .refine((value) => Math.round(value * 100) / 100 === value, 'Salary can have at most 2 decimal places.'),
  );

// Accepts 2024-03-01 or a full ISO timestamp. z.iso.date() rejects impossible
// dates such as 2024-02-31.
const dateField = requiredText('Date of joining')
  .trim()
  .pipe(
    z.union([z.iso.date(), z.iso.datetime({ offset: true })], {
      error: 'Date of joining must be a valid date (YYYY-MM-DD).',
    }),
  )
  .transform((value) => new Date(value))
  .refine(
    (date) => date.getUTCFullYear() >= 1950 && date.getTime() <= Date.now() + 366 * 24 * 60 * 60 * 1000,
    'Date of joining must be between 1950 and one year from today.',
  );

// strictObject rejects unknown properties. That is what stops a client from
// sending "user" (to claim someone else's ownership), "_id", "created_at" or
// "profile_picture" as plain text.
export const employeeCreateSchema = z.strictObject(
  {
    first_name: nameField('First name'),
    last_name: nameField('Last name'),
    email: emailField,
    position: labelField('Position'),
    salary: salaryField,
    date_of_joining: dateField,
    department: labelField('Department'),
  },
  { error: 'Employee details are required.' },
);

export type EmployeeInput = z.infer<typeof employeeCreateSchema>;

// PUT: every field is optional but the same rules apply to the ones that are
// sent, and unknown fields are still rejected.
export const employeeUpdateSchema = employeeCreateSchema.partial();

// /employees/:eid  (the id is part of the URL path)
export const employeeIdParamsSchema = z.strictObject({ eid: objectIdField('Employee id') });

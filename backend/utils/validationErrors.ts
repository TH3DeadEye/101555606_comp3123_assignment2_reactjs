import type { ZodError } from 'zod';
import { HttpError, type FieldError } from './HttpError';

export function validationError(errors: FieldError[]): HttpError {
  return new HttpError(400, 'Validation failed. Please check the submitted values.', {
    code: 'VALIDATION_ERROR',
    errors,
  });
}

// Converts a Zod failure into one { field, message } entry per problem so the
// frontend can show each message next to the right input.
export function fromZodError(error: ZodError): HttpError {
  const errors: FieldError[] = [];

  for (const issue of error.issues) {
    if (issue.code === 'unrecognized_keys') {
      for (const key of issue.keys) {
        errors.push({ field: key, message: 'This field is not allowed.' });
      }
      continue;
    }
    errors.push({ field: issue.path.map(String).join('.') || 'body', message: issue.message });
  }

  return validationError(errors);
}

import { z } from 'zod';

// A string field with friendly messages: "<label> is required." when it is
// missing and "<label> must be text." when it has the wrong type (for example
// a number or an object, which also blocks NoSQL operator injection such as
// { "$ne": null }).
export function requiredText(label: string) {
  return z.string({
    error: (issue) => (issue.input === undefined ? `${label} is required.` : `${label} must be text.`),
  });
}

// Trimmed, lower-cased and checked for a valid e-mail format.
export const emailField = requiredText('Email')
  .trim()
  .min(1, 'Email is required.')
  .toLowerCase()
  .pipe(z.email({ error: 'Enter a valid email address.' }).max(254, 'Email must be at most 254 characters.'));

import { API_ORIGIN } from '../api/client';
import type { Employee } from '../api/types';

// Dates of joining are stored as midnight UTC (2024-03-01T00:00:00.000Z).
// Formatting them in the viewer's time zone would show February 29 to anyone
// west of Greenwich, so they are always formatted in UTC.
const dateFormat = new Intl.DateTimeFormat('en-CA', { dateStyle: 'medium', timeZone: 'UTC' });
// Created/updated times are real moments, so they use the viewer's time zone.
const dateTimeFormat = new Intl.DateTimeFormat('en-CA', { dateStyle: 'medium', timeStyle: 'short' });
const salaryFormat = new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' });

const NOT_AVAILABLE = '—';

export function formatDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? NOT_AVAILABLE : dateFormat.format(date);
}

export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? NOT_AVAILABLE : dateTimeFormat.format(date);
}

export function formatSalary(amount: number): string {
  return Number.isFinite(amount) ? salaryFormat.format(amount) : NOT_AVAILABLE;
}

// The value an <input type="date"> needs: the UTC calendar date, YYYY-MM-DD.
export function toDateInputValue(iso: string): string {
  return /^\d{4}-\d{2}-\d{2}/.test(iso) ? iso.slice(0, 10) : '';
}

export function fullName(employee: Pick<Employee, 'first_name' | 'last_name'>): string {
  return `${employee.first_name} ${employee.last_name}`;
}

// Turns what the API stores (/uploads/<file>.png) into an address the browser
// can load, because the pictures live on the backend's origin, not the frontend's.
export function resolvePictureUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path; // already a full URL (for example cloud storage)
  return `${API_ORIGIN}${path.startsWith('/') ? path : `/${path}`}`;
}

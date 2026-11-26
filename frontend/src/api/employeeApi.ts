import { api } from './client';
import type { Employee, EmployeeInput, SearchParams } from './types';

const EMPLOYEES = '/emp/employees';

// GET /api/v1/emp/employees -> only the logged-in user's employees
export async function listEmployees(signal?: AbortSignal): Promise<Employee[]> {
  const { data } = await api.get<Employee[]>(EMPLOYEES, { signal });
  return data;
}

// GET /api/v1/emp/employees/search?department=...&position=...
// The search is done by the backend, never by filtering the full list here.
export async function searchEmployees(params: SearchParams, signal?: AbortSignal): Promise<Employee[]> {
  const { data } = await api.get<Employee[]>(`${EMPLOYEES}/search`, { params, signal });
  return data;
}

// GET /api/v1/emp/employees/:eid -> 403 when it belongs to another user, 404 when it does not exist
export async function getEmployee(id: string, signal?: AbortSignal): Promise<Employee> {
  const { data } = await api.get<Employee>(`${EMPLOYEES}/${encodeURIComponent(id)}`, { signal });
  return data;
}

// The text fields and the optional picture travel together as multipart/form-data.
// The picture goes in the "profile_picture" field the backend expects.
export function toFormData(input: EmployeeInput, picture: File | null): FormData {
  const form = new FormData();
  for (const [key, value] of Object.entries(input)) form.append(key, value.trim());
  if (picture) form.append('profile_picture', picture);
  return form;
}

// POST /api/v1/emp/employees -> 201
export async function createEmployee(input: EmployeeInput, picture: File | null): Promise<Employee> {
  const { data } = await api.post<Employee>(EMPLOYEES, toFormData(input, picture));
  return data;
}

// PUT /api/v1/emp/employees/:eid -> 200 (a new picture replaces the old one)
export async function updateEmployee(id: string, input: EmployeeInput, picture: File | null): Promise<Employee> {
  const { data } = await api.put<Employee>(`${EMPLOYEES}/${encodeURIComponent(id)}`, toFormData(input, picture));
  return data;
}

// DELETE /api/v1/emp/employees?eid=xxx -> 204
export async function deleteEmployee(id: string): Promise<void> {
  await api.delete(EMPLOYEES, { params: { eid: id } });
}

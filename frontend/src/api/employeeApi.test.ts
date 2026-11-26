import type { InternalAxiosRequestConfig } from 'axios';
import { afterEach, describe, expect, it } from 'vitest';
import { fakeServer, makeEmployee, restoreServer } from '../test/helpers';
import { createEmployee, deleteEmployee, getEmployee, listEmployees, searchEmployees, toFormData, updateEmployee } from './employeeApi';
import type { EmployeeInput } from './types';

afterEach(restoreServer);

const input: EmployeeInput = {
  first_name: ' Jane ',
  last_name: 'Doe',
  email: 'jane@example.com',
  position: 'Engineer',
  department: 'Engineering',
  salary: '85000.50',
  date_of_joining: '2024-03-01',
};

// Remembers the last request so a test can look at it.
function recordRequests(response: { status: number; data?: unknown } = { status: 200, data: [] }) {
  const seen: InternalAxiosRequestConfig[] = [];
  fakeServer((config) => {
    seen.push(config);
    return response;
  });
  return seen;
}

describe('reading employees', () => {
  it('lists with GET /emp/employees', async () => {
    const seen = recordRequests({ status: 200, data: [makeEmployee()] });

    const result = await listEmployees();

    expect(seen[0]).toMatchObject({ method: 'get', url: '/emp/employees' });
    expect(result).toHaveLength(1);
  });

  it('searches through the backend, passing the terms as query parameters', async () => {
    const seen = recordRequests();

    await searchEmployees({ department: 'eng', position: 'dev' });

    expect(seen[0]).toMatchObject({ method: 'get', url: '/emp/employees/search', params: { department: 'eng', position: 'dev' } });
  });

  it('gets one employee, encoding the id', async () => {
    const seen = recordRequests({ status: 200, data: makeEmployee() });

    await getEmployee('a/b c');

    expect(seen[0]?.url).toBe('/emp/employees/a%2Fb%20c');
  });
});

describe('writing employees (multipart/form-data)', () => {
  it('builds the form with trimmed text fields and the picture in "profile_picture"', () => {
    const picture = new File(['png-bytes'], 'me.png', { type: 'image/png' });

    const form = toFormData(input, picture);

    expect(form.get('first_name')).toBe('Jane'); // trimmed
    expect(form.get('salary')).toBe('85000.50');
    expect(form.get('date_of_joining')).toBe('2024-03-01');
    expect((form.get('profile_picture') as File).name).toBe('me.png');
  });

  it('leaves the picture field out when no picture was chosen', () => {
    expect(toFormData(input, null).has('profile_picture')).toBe(false);
  });

  it('creates with POST /emp/employees', async () => {
    const seen = recordRequests({ status: 201, data: makeEmployee() });

    await createEmployee(input, null);

    expect(seen[0]).toMatchObject({ method: 'post', url: '/emp/employees' });
    expect(seen[0]?.data).toBeInstanceOf(FormData);
  });

  it('updates with PUT /emp/employees/:id', async () => {
    const seen = recordRequests({ status: 200, data: makeEmployee() });

    await updateEmployee('emp-1', input, new File(['x'], 'new.jpg', { type: 'image/jpeg' }));

    expect(seen[0]).toMatchObject({ method: 'put', url: '/emp/employees/emp-1' });
    expect((seen[0]?.data as FormData).has('profile_picture')).toBe(true);
  });

  it('deletes with DELETE /emp/employees?eid=...', async () => {
    const seen = recordRequests({ status: 204 });

    await expect(deleteEmployee('emp-1')).resolves.toBeUndefined();

    expect(seen[0]).toMatchObject({ method: 'delete', url: '/emp/employees', params: { eid: 'emp-1' } });
  });
});

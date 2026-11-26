import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { InternalAxiosRequestConfig } from 'axios';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import type { EmployeeInput } from '../api/types';
import { fakeServer, makeEmployee, restoreServer } from '../test/helpers';
import { cleanSearch, useCreateEmployee, useDeleteEmployee, useEmployee, useEmployees, useUpdateEmployee } from './useEmployees';

afterEach(restoreServer);

function wrapperFor(queryClient: QueryClient) {
  return ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
const newClient = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });

const input: EmployeeInput = {
  first_name: 'Jane', last_name: 'Doe', email: 'jane@example.com', position: 'Engineer',
  department: 'Engineering', salary: '85000', date_of_joining: '2024-03-01',
};

// Answers like the backend and remembers each request as "METHOD url".
function backend() {
  const calls: string[] = [];
  const configs: InternalAxiosRequestConfig[] = [];
  fakeServer((config) => {
    calls.push(`${config.method?.toUpperCase()} ${config.url}`);
    configs.push(config);
    if (config.method === 'delete') return { status: 204 };
    if (config.method === 'post') return { status: 201, data: makeEmployee() };
    if (config.method === 'put') return { status: 200, data: makeEmployee() };
    if (config.url?.endsWith('/search')) return { status: 200, data: [makeEmployee({ first_name: 'Found' })] };
    if (config.url === '/emp/employees') return { status: 200, data: [makeEmployee(), makeEmployee({ _id: 'emp-2' })] };
    return { status: 200, data: makeEmployee() };
  });
  return { calls, configs };
}

describe('cleanSearch', () => {
  it('trims the terms and drops blank ones', () => {
    expect(cleanSearch({ department: '  eng ', position: '   ' })).toEqual({ department: 'eng' });
    expect(cleanSearch({})).toEqual({});
    expect(cleanSearch({ department: '', position: '' })).toEqual({});
  });
});

describe('useEmployees', () => {
  it('loads the whole list when there are no search terms', async () => {
    const { calls } = backend();
    const { result } = renderHook(() => useEmployees({ department: '  ' }), { wrapper: wrapperFor(newClient()) });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(2);
    expect(calls).toEqual(['GET /emp/employees']);
  });

  it('uses the backend search endpoint (not the list) when terms are given', async () => {
    const { calls, configs } = backend();
    const { result } = renderHook(() => useEmployees({ department: ' eng ', position: '' }), { wrapper: wrapperFor(newClient()) });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.[0]?.first_name).toBe('Found');
    expect(calls).toEqual(['GET /emp/employees/search']);
    expect(configs[0]?.params).toEqual({ department: 'eng' });
  });

  it('keeps the old rows while the next search loads', async () => {
    backend();
    const { result, rerender } = renderHook(({ department }) => useEmployees({ department }), {
      wrapper: wrapperFor(newClient()),
      initialProps: { department: '' },
    });
    await waitFor(() => expect(result.current.data).toHaveLength(2));

    rerender({ department: 'eng' });

    expect(result.current.data).toHaveLength(2); // still the previous rows, not undefined
    await waitFor(() => expect(result.current.data?.[0]?.first_name).toBe('Found'));
  });
});

describe('useEmployee', () => {
  it('loads one employee by id', async () => {
    const { calls } = backend();
    const { result } = renderHook(() => useEmployee('emp-1'), { wrapper: wrapperFor(newClient()) });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(calls).toEqual(['GET /emp/employees/emp-1']);
  });

  it('exposes a 404 as an error instead of retrying it', async () => {
    let attempts = 0;
    fakeServer(() => {
      attempts += 1;
      return { status: 404, data: { status: 'error', code: 'NOT_FOUND' } };
    });
    const { result } = renderHook(() => useEmployee('missing'), { wrapper: wrapperFor(newClient()) });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(attempts).toBe(1);
  });
});

describe('changing employees refreshes the list', () => {
  function listAndActions(queryClient: QueryClient) {
    return renderHook(
      () => ({
        list: useEmployees(),
        create: useCreateEmployee(),
        update: useUpdateEmployee('emp-1'),
        remove: useDeleteEmployee(),
      }),
      { wrapper: wrapperFor(queryClient) },
    );
  }

  it.each([
    ['create', 'POST /emp/employees'],
    ['update', 'PUT /emp/employees/emp-1'],
    ['remove', 'DELETE /emp/employees'],
  ] as const)('after %s the list is loaded again', async (action, expectedCall) => {
    const { calls } = backend();
    const { result } = listAndActions(newClient());
    await waitFor(() => expect(result.current.list.isSuccess).toBe(true));
    expect(calls.filter((call) => call === 'GET /emp/employees')).toHaveLength(1);

    await act(async () => {
      if (action === 'remove') await result.current.remove.mutateAsync('emp-1');
      else await result.current[action].mutateAsync({ input, picture: null });
    });

    expect(calls).toContain(expectedCall);
    await waitFor(() => expect(calls.filter((call) => call === 'GET /emp/employees')).toHaveLength(2));
  });
});

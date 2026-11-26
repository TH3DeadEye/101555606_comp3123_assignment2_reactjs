import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createEmployee, deleteEmployee, getEmployee, listEmployees, searchEmployees, updateEmployee } from '../api/employeeApi';
import type { EmployeeInput, SearchParams } from '../api/types';

// Every employee query lives under ['employees'], so one invalidation refreshes
// the list, any search result and every detail page after a change.
export const employeeKeys = {
  all: ['employees'] as const,
  list: () => [...employeeKeys.all, 'list'] as const,
  search: (terms: SearchParams) => [...employeeKeys.all, 'search', terms] as const,
  detail: (id: string) => [...employeeKeys.all, 'detail', id] as const,
};

// Trims the terms and drops blank ones, so "" and "not given" mean the same.
export function cleanSearch(terms: SearchParams): SearchParams {
  const department = terms.department?.trim();
  const position = terms.position?.trim();
  return { ...(department ? { department } : {}), ...(position ? { position } : {}) };
}

// The list of the user's employees, or the result of a search when terms are given.
export function useEmployees(search: SearchParams = {}) {
  const terms = cleanSearch(search);
  const isSearching = Object.keys(terms).length > 0;

  return useQuery({
    queryKey: isSearching ? employeeKeys.search(terms) : employeeKeys.list(),
    queryFn: ({ signal }) => (isSearching ? searchEmployees(terms, signal) : listEmployees(signal)),
    // Keep showing the previous rows while the next search loads, instead of flashing a spinner.
    placeholderData: keepPreviousData,
  });
}

export function useEmployee(id: string) {
  return useQuery({
    queryKey: employeeKeys.detail(id),
    queryFn: ({ signal }) => getEmployee(id, signal),
  });
}

export interface SaveEmployeeVariables {
  input: EmployeeInput;
  picture: File | null;
}

export function useCreateEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ input, picture }: SaveEmployeeVariables) => createEmployee(input, picture),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: employeeKeys.all }),
  });
}

export function useUpdateEmployee(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ input, picture }: SaveEmployeeVariables) => updateEmployee(id, input, picture),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: employeeKeys.all }),
  });
}

export function useDeleteEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteEmployee(id),
    // Also after a failure: a 404 means somebody already deleted it, and the list should show that.
    onSettled: () => queryClient.invalidateQueries({ queryKey: employeeKeys.all }),
  });
}

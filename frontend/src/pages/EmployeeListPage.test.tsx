import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import type { Employee } from '../api/types';
import { fakeNetworkFailure, fakePendingServer, fakeServer, makeEmployee, restoreServer } from '../test/helpers';
import { renderWithProviders } from '../test/render';
import EmployeeListPage from './EmployeeListPage';

afterEach(restoreServer);

const renderList = () => renderWithProviders(<EmployeeListPage />, { route: '/employees', authenticated: true });

const employees = [
  makeEmployee({ _id: 'e1', first_name: 'Jane', last_name: 'Doe', position: 'Engineer', department: 'Engineering' }),
  makeEmployee({ _id: 'e2', first_name: 'Bob', last_name: 'Adams', position: 'Accountant', department: 'Finance', profile_picture: '/uploads/bob.png' }),
];

describe('EmployeeListPage: loading', () => {
  it('shows a loading state until the data arrives', async () => {
    fakeServer(() => ({ status: 200, data: employees }));
    renderList();

    expect(screen.getByRole('status')).toHaveTextContent('Loading employees…');
    expect(await screen.findByRole('table', { name: 'Employees' })).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});

describe('EmployeeListPage: with employees', () => {
  it('shows a heading, the count, an Add button and a row per employee', async () => {
    fakeServer(() => ({ status: 200, data: employees }));
    renderList();

    expect(await screen.findByRole('row', { name: /Jane Doe/ })).toBeInTheDocument();
    expect(screen.getByRole('row', { name: /Bob Adams/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Employees' })).toBeInTheDocument();
    expect(screen.getByText('2 employees')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Add employee' })).toHaveAttribute('href', '/employees/add');
  });

  it('uses the singular for one employee', async () => {
    fakeServer(() => ({ status: 200, data: [employees[0]] }));
    renderList();

    expect(await screen.findByText('1 employee')).toBeInTheDocument();
  });

  it('shows the picture thumbnails and view/edit links', async () => {
    fakeServer(() => ({ status: 200, data: employees }));
    renderList();

    const bob = await screen.findByRole('row', { name: /Bob Adams/ });
    expect(within(bob).getByRole('img')).toBeInTheDocument();
    expect(within(bob).getByRole('link', { name: 'View Bob Adams' })).toHaveAttribute('href', '/employees/e2');
    expect(within(bob).getByRole('link', { name: 'Edit Bob Adams' })).toHaveAttribute('href', '/employees/e2/edit');
  });
});

describe('EmployeeListPage: empty', () => {
  it('invites the user to add the first employee', async () => {
    fakeServer(() => ({ status: 200, data: [] }));
    renderList();

    expect(await screen.findByRole('heading', { name: 'No employees yet' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Add employee' })).toHaveAttribute('href', '/employees/add');
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});

describe('EmployeeListPage: errors', () => {
  it('shows a friendly message and a working "Try again" button when the server fails', async () => {
    const user = userEvent.setup();
    let failing = true;
    fakeServer(() => (failing ? { status: 500, data: { status: 'error', code: 'INTERNAL_ERROR', message: 'secret internals' } } : { status: 200, data: employees }));
    renderList();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('The server ran into a problem. Please try again in a moment.');
    expect(alert).not.toHaveTextContent('secret internals');

    failing = false;
    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByRole('row', { name: /Jane Doe/ })).toBeInTheDocument();
  });

  it('explains a network failure', async () => {
    fakeNetworkFailure();
    renderList();

    expect(await screen.findByRole('alert')).toHaveTextContent('Cannot reach the server. Check your connection and try again.');
  });
});

// A backend that remembers its employees, so a delete really removes the row
// after the list is loaded again. `onDelete` can override the answer.
function statefulBackend(initial: Employee[], onDelete?: (eid: string) => { status: number; data?: unknown } | undefined) {
  let current = [...initial];
  const requests: string[] = [];
  fakeServer((config) => {
    const params = config.params as { eid?: string } | undefined;
    requests.push(`${config.method?.toUpperCase()} ${config.url}${params?.eid ? `?eid=${params.eid}` : ''}`);
    if (config.method === 'delete') {
      const override = onDelete?.(String(params?.eid));
      if (override) return override;
      current = current.filter((employee) => employee._id !== params?.eid);
      return { status: 204 };
    }
    return { status: 200, data: current };
  });
  return requests;
}

const deleteRequests = (requests: string[]) => requests.filter((request) => request.startsWith('DELETE'));

describe('EmployeeListPage: deleting', () => {
  it('asks for confirmation first and sends nothing yet', async () => {
    const user = userEvent.setup();
    const requests = statefulBackend(employees);
    renderList();

    await user.click(await screen.findByRole('button', { name: 'Delete Jane Doe' }));

    const dialog = await screen.findByRole('dialog', { name: 'Delete Jane Doe?' });
    expect(dialog).toHaveTextContent('This cannot be undone.');
    expect(deleteRequests(requests)).toHaveLength(0);
  });

  it('does nothing when the user cancels', async () => {
    const user = userEvent.setup();
    const requests = statefulBackend(employees);
    renderList();

    await user.click(await screen.findByRole('button', { name: 'Delete Jane Doe' }));
    await user.click(await screen.findByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByRole('row', { name: /Jane Doe/ })).toBeInTheDocument();
    expect(deleteRequests(requests)).toHaveLength(0);
  });

  it('cancels with the Escape key', async () => {
    const user = userEvent.setup();
    const requests = statefulBackend(employees);
    renderList();

    await user.click(await screen.findByRole('button', { name: 'Delete Jane Doe' }));
    await screen.findByRole('dialog');
    await user.keyboard('{Escape}');

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(deleteRequests(requests)).toHaveLength(0);
  });

  it('deletes after confirmation, says so, and the row disappears', async () => {
    const user = userEvent.setup();
    const requests = statefulBackend(employees);
    renderList();

    await user.click(await screen.findByRole('button', { name: 'Delete Jane Doe' }));
    await user.click(await screen.findByRole('button', { name: 'Delete' }));

    expect(await screen.findByText('Jane Doe was deleted.')).toBeInTheDocument();
    // while the dialog fades out, the page behind it is still hidden from assistive technology
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await waitFor(() => expect(screen.queryByRole('row', { name: /Jane Doe/ })).not.toBeInTheDocument());
    expect(screen.getByRole('row', { name: /Bob Adams/ })).toBeInTheDocument();
    expect(deleteRequests(requests)).toEqual(['DELETE /emp/employees?eid=e1']);
  });

  it('shows the empty state after the last employee is deleted', async () => {
    const user = userEvent.setup();
    statefulBackend([employees[0] as Employee]);
    renderList();

    await user.click(await screen.findByRole('button', { name: 'Delete Jane Doe' }));
    await user.click(await screen.findByRole('button', { name: 'Delete' }));

    expect(await screen.findByRole('heading', { name: 'No employees yet' })).toBeInTheDocument();
  });

  it('keeps the dialog open with a friendly error when the server fails, so the user can retry', async () => {
    const user = userEvent.setup();
    let failing = true;
    statefulBackend(employees, () => (failing ? { status: 500, data: { status: 'error', code: 'INTERNAL_ERROR', message: 'secret internals' } } : undefined));
    renderList();

    await user.click(await screen.findByRole('button', { name: 'Delete Jane Doe' }));
    await user.click(await screen.findByRole('button', { name: 'Delete' }));

    const dialog = await screen.findByRole('dialog');
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('The server ran into a problem. Please try again in a moment.');
    expect(dialog).not.toHaveTextContent('secret internals');
    // the page behind an open modal is aria-hidden on purpose, so look for the row regardless
    expect(screen.getByRole('row', { name: /Jane Doe/, hidden: true })).toBeInTheDocument();

    failing = false;
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }));
    expect(await screen.findByText('Jane Doe was deleted.')).toBeInTheDocument();
  });

  it('closes the dialog and refreshes when the employee is already gone (404)', async () => {
    const user = userEvent.setup();
    // the server no longer has Jane, but the screen still shows her
    let current = [...employees];
    fakeServer((config) => {
      if (config.method === 'delete') {
        current = current.filter((employee) => employee._id !== 'e1');
        return { status: 404, data: { status: 'error', code: 'NOT_FOUND', message: 'Employee not found.' } };
      }
      return { status: 200, data: current };
    });
    renderList();

    await user.click(await screen.findByRole('button', { name: 'Delete Jane Doe' }));
    await user.click(await screen.findByRole('button', { name: 'Delete' }));

    expect(await screen.findByText(/could not be found/)).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await waitFor(() => expect(screen.queryByRole('row', { name: /Jane Doe/ })).not.toBeInTheDocument());
  });

  it('cannot be confirmed twice while the request is running', async () => {
    const user = userEvent.setup();
    statefulBackend(employees);
    renderList();
    await user.click(await screen.findByRole('button', { name: 'Delete Jane Doe' }));
    await screen.findByRole('dialog');

    fakePendingServer(); // from now on the server never answers
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(screen.getByRole('button', { name: 'Delete' })).toBeDisabled());
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
  });
});

// Answers the list endpoint with `all` and the search endpoint with whatever
// `search` returns, remembering the query parameters of every search.
function searchableBackend(all: Employee[], search: (params: { department?: string; position?: string }) => Employee[] | { status: number; data: unknown }) {
  const searches: { department?: string; position?: string }[] = [];
  const requests: string[] = [];
  fakeServer((config) => {
    requests.push(`${config.method?.toUpperCase()} ${config.url}`);
    if (config.url === '/emp/employees/search') {
      const params = (config.params ?? {}) as { department?: string; position?: string };
      searches.push(params);
      const result = search(params);
      return Array.isArray(result) ? { status: 200, data: result } : result;
    }
    return { status: 200, data: all };
  });
  return { searches, requests };
}

describe('EmployeeListPage: searching', () => {
  // "Zed" is in Sales: if the browser filtered the list itself he could never appear for "eng"
  const zed = makeEmployee({ _id: 'e9', first_name: 'Zed', last_name: 'Zebra', department: 'Sales', position: 'Rep' });

  it('shows the search bar when there are employees, and hides it when there are none', async () => {
    fakeServer(() => ({ status: 200, data: employees }));
    const { unmount } = renderList();
    expect(await screen.findByRole('search', { name: 'Search employees' })).toBeInTheDocument();
    unmount();

    fakeServer(() => ({ status: 200, data: [] }));
    renderList();
    await screen.findByRole('heading', { name: 'No employees yet' });
    expect(screen.queryByRole('search')).not.toBeInTheDocument();
  });

  it('asks the backend to search and shows exactly what it returns (no filtering in the browser)', async () => {
    const user = userEvent.setup();
    const { searches } = searchableBackend(employees, () => [zed]);
    renderList();

    await user.type(await screen.findByLabelText('Department'), 'eng');

    expect(await screen.findByRole('row', { name: /Zed Zebra/ })).toBeInTheDocument();
    expect(screen.queryByRole('row', { name: /Jane Doe/ })).not.toBeInTheDocument();
    expect(searches).toEqual([{ department: 'eng' }]);
    expect(screen.getByText('1 employee matches your search')).toBeInTheDocument();
  });

  it('waits for a pause in typing: one request, not one per keystroke', async () => {
    const user = userEvent.setup();
    const { searches } = searchableBackend(employees, () => [zed]);
    renderList();

    await user.type(await screen.findByLabelText('Department'), 'engineering');
    await screen.findByRole('row', { name: /Zed Zebra/ });

    expect(searches).toEqual([{ department: 'engineering' }]);
  });

  it('can search by department and position together', async () => {
    const user = userEvent.setup();
    const { searches } = searchableBackend(employees, () => [zed]);
    renderList();

    await user.type(await screen.findByLabelText('Department'), 'eng');
    await user.type(screen.getByLabelText('Position'), 'dev');
    await screen.findByRole('row', { name: /Zed Zebra/ });

    expect(searches.at(-1)).toEqual({ department: 'eng', position: 'dev' });
  });

  it('can search by position alone', async () => {
    const user = userEvent.setup();
    const { searches } = searchableBackend(employees, () => [zed]);
    renderList();

    await user.type(await screen.findByLabelText('Position'), 'dev');
    await screen.findByRole('row', { name: /Zed Zebra/ });

    expect(searches).toEqual([{ position: 'dev' }]);
  });

  it('does not search for spaces', async () => {
    const user = userEvent.setup();
    const { searches } = searchableBackend(employees, () => [zed]);
    renderList();

    await user.type(await screen.findByLabelText('Department'), '   ');
    await new Promise((resolve) => setTimeout(resolve, 500)); // longer than the debounce

    expect(searches).toHaveLength(0);
    expect(screen.getByRole('row', { name: /Jane Doe/ })).toBeInTheDocument();
  });

  it('"Clear search" returns to the full list at once and empties the boxes', async () => {
    const user = userEvent.setup();
    const { requests } = searchableBackend(employees, () => [zed]);
    renderList();
    await user.type(await screen.findByLabelText('Department'), 'eng');
    await screen.findByRole('row', { name: /Zed Zebra/ });

    await user.click(screen.getByRole('button', { name: 'Clear search' }));

    expect(screen.getByLabelText('Department')).toHaveValue('');
    expect(await screen.findByRole('row', { name: /Jane Doe/ })).toBeInTheDocument();
    expect(screen.queryByRole('row', { name: /Zed Zebra/ })).not.toBeInTheDocument();
    expect(screen.getByText('2 employees')).toBeInTheDocument();
    expect(requests.filter((request) => request === 'GET /emp/employees/search')).toHaveLength(1);
  });

  it('says so when nothing matches, and keeps the search bar to try again', async () => {
    const user = userEvent.setup();
    searchableBackend(employees, () => []);
    renderList();

    await user.type(await screen.findByLabelText('Department'), 'nothing');

    expect(await screen.findByRole('heading', { name: 'No employees match your search' })).toBeInTheDocument();
    expect(screen.getByRole('search')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Show all employees' }));
    expect(await screen.findByRole('row', { name: /Jane Doe/ })).toBeInTheDocument();
  });

  it('shows a friendly error when the search request fails, and recovers', async () => {
    const user = userEvent.setup();
    let failing = true;
    searchableBackend(employees, () => (failing ? { status: 500, data: { status: 'error', code: 'INTERNAL_ERROR' } } : [zed]));
    renderList();

    await user.type(await screen.findByLabelText('Department'), 'eng');

    expect(await screen.findByRole('alert')).toHaveTextContent('The server ran into a problem. Please try again in a moment.');
    expect(screen.getByRole('search')).toBeInTheDocument();

    failing = false;
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('row', { name: /Zed Zebra/ })).toBeInTheDocument();
  });
});

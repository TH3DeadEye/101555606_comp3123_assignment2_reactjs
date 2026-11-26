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

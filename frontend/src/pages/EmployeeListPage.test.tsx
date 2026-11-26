import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { fakeNetworkFailure, fakeServer, makeEmployee, restoreServer } from '../test/helpers';
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

import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { API_ORIGIN } from '../api/client';
import { fakeNetworkFailure, fakeServer, makeEmployee, restoreServer } from '../test/helpers';
import { renderWithProviders } from '../test/render';
import EmployeeDetailsPage from './EmployeeDetailsPage';

afterEach(restoreServer);

const renderDetails = (id = 'e1') =>
  renderWithProviders(
    <Routes>
      <Route path="/employees/:id" element={<EmployeeDetailsPage />} />
      <Route path="/employees/:id/edit" element={<p>edit screen</p>} />
      <Route path="/employees" element={<p>employee list screen</p>} />
    </Routes>,
    { route: `/employees/${id}`, authenticated: true },
  );

const jane = makeEmployee({ _id: 'e1', profile_picture: '/uploads/jane.png', email: 'jane.doe@example.com' });

// Remembers every request, and answers the employee, or whatever `answer` says.
function backend(answer?: (method: string) => { status: number; data?: unknown } | undefined) {
  const requests: string[] = [];
  fakeServer((config) => {
    const label = `${config.method?.toUpperCase()} ${config.url}${(config.params as { eid?: string } | undefined)?.eid ? `?eid=${(config.params as { eid: string }).eid}` : ''}`;
    requests.push(label);
    return answer?.(config.method ?? 'get') ?? (config.method === 'delete' ? { status: 204 } : { status: 200, data: jane });
  });
  return requests;
}

describe('EmployeeDetailsPage: showing an employee', () => {
  it('shows a loading state first', async () => {
    backend();
    renderDetails();

    expect(screen.getByRole('status')).toHaveTextContent('Loading employee…');
    expect(await screen.findByRole('heading', { name: 'Jane Doe', level: 1 })).toBeInTheDocument();
  });

  it('shows every detail in a readable form', async () => {
    backend();
    renderDetails();

    expect(await screen.findByRole('heading', { name: 'Jane Doe' })).toBeInTheDocument();
    expect(screen.getByText('Software Engineer')).toBeInTheDocument();
    expect(screen.getByText('Engineering')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'jane.doe@example.com' })).toHaveAttribute('href', 'mailto:jane.doe@example.com');
    expect(screen.getByText('$85,000.00')).toBeInTheDocument();
    expect(screen.getByText('Mar 1, 2024')).toBeInTheDocument();
    expect(screen.getByText('Date of joining')).toBeInTheDocument();
  });

  it('shows the profile picture, or a placeholder when there is none', async () => {
    backend();
    const { unmount } = renderDetails();
    expect(await screen.findByRole('img', { name: 'Profile picture of Jane Doe' })).toHaveAttribute('src', `${API_ORIGIN}/uploads/jane.png`);
    unmount();

    backend(() => ({ status: 200, data: makeEmployee({ profile_picture: null }) }));
    renderDetails();
    await screen.findByRole('heading', { name: 'Jane Doe' });
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('links to the edit screen and back to the list', async () => {
    backend();
    renderDetails();

    expect(await screen.findByRole('link', { name: 'Edit' })).toHaveAttribute('href', '/employees/e1/edit');
    expect(screen.getByRole('link', { name: 'Back to employees' })).toHaveAttribute('href', '/employees');
  });
});

describe('EmployeeDetailsPage: employees that cannot be shown', () => {
  it("another user's employee (403), for example by typing the URL: access denied and no data", async () => {
    backend(() => ({ status: 403, data: { status: 'error', code: 'FORBIDDEN', message: 'You do not have permission to access this employee.' } }));
    renderDetails('someone-elses');

    expect(await screen.findByRole('heading', { name: 'Access denied' })).toBeInTheDocument();
    expect(screen.getByText("You don't have access to this employee.")).toBeInTheDocument();
    expect(screen.queryByText('Jane Doe')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument(); // retrying a 403 is pointless
    expect(screen.getAllByRole('link', { name: /back to employees/i }).length).toBeGreaterThan(0);
  });

  it('an employee that does not exist (404)', async () => {
    backend(() => ({ status: 404, data: { status: 'error', code: 'NOT_FOUND', message: 'Employee not found.' } }));
    renderDetails('missing');

    expect(await screen.findByRole('heading', { name: 'Not found' })).toBeInTheDocument();
    expect(screen.getByText(/could not be found/)).toBeInTheDocument();
  });

  it('a network failure, with a Try again button that works', async () => {
    const user = userEvent.setup();
    fakeNetworkFailure();
    renderDetails();
    expect(await screen.findByRole('alert')).toHaveTextContent('Cannot reach the server. Check your connection and try again.');

    backend();
    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByRole('heading', { name: 'Jane Doe' })).toBeInTheDocument();
  });
});

describe('EmployeeDetailsPage: deleting', () => {
  it('asks first, and deletes nothing when cancelled', async () => {
    const user = userEvent.setup();
    const requests = backend();
    renderDetails();

    await user.click(await screen.findByRole('button', { name: 'Delete' }));
    expect(await screen.findByRole('dialog', { name: 'Delete Jane Doe?' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(requests.some((request) => request.startsWith('DELETE'))).toBe(false);
    expect(screen.getByRole('heading', { name: 'Jane Doe' })).toBeInTheDocument();
  });

  it('deletes after confirmation, says so, and returns to the list without a "not found" flash', async () => {
    const user = userEvent.setup();
    const requests = backend();
    renderDetails();

    await user.click(await screen.findByRole('button', { name: 'Delete' }));
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Delete' }));

    expect(await screen.findByText('employee list screen')).toBeInTheDocument();
    expect(await screen.findByText('Jane Doe was deleted.')).toBeInTheDocument();
    expect(requests).toContain('DELETE /emp/employees?eid=e1');
    // the deleted employee was never asked for again, so no 404 was shown on the way out
    expect(requests.filter((request) => request === 'GET /emp/employees/e1')).toHaveLength(1);
    expect(screen.queryByText('Not found')).not.toBeInTheDocument();
  });

  it('keeps the dialog open with a friendly message when the server fails, so the user can retry', async () => {
    const user = userEvent.setup();
    let failing = true;
    backend((method) => (method === 'delete' && failing ? { status: 500, data: { status: 'error', code: 'INTERNAL_ERROR', message: 'internals' } } : undefined));
    renderDetails();

    await user.click(await screen.findByRole('button', { name: 'Delete' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('The server ran into a problem. Please try again in a moment.');
    expect(dialog).not.toHaveTextContent('internals');

    failing = false;
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }));
    expect(await screen.findByText('employee list screen')).toBeInTheDocument();
  });

  it('goes back to the list when the employee was already deleted elsewhere (404)', async () => {
    const user = userEvent.setup();
    backend((method) => (method === 'delete' ? { status: 404, data: { status: 'error', code: 'NOT_FOUND', message: 'Employee not found.' } } : undefined));
    renderDetails();

    await user.click(await screen.findByRole('button', { name: 'Delete' }));
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Delete' }));

    expect(await screen.findByText('employee list screen')).toBeInTheDocument();
    expect(await screen.findByText(/could not be found/)).toBeInTheDocument();
  });
});

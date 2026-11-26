import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { InternalAxiosRequestConfig } from 'axios';
import { Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { fakeNetworkFailure, fakeServer, makeEmployee, restoreServer } from '../test/helpers';
import { renderWithProviders } from '../test/render';
import EditEmployeePage from './EditEmployeePage';

afterEach(restoreServer);

const renderEdit = (id = 'e1') =>
  renderWithProviders(
    <Routes>
      <Route path="/employees/:id/edit" element={<EditEmployeePage />} />
      <Route path="/employees" element={<p>employee list screen</p>} />
    </Routes>,
    { route: `/employees/${id}/edit`, authenticated: true },
  );

const field = {
  first: () => screen.getByLabelText(/^first name\s*\*$/i),
  email: () => screen.getByLabelText(/^email\s*\*$/i),
  salary: () => screen.getByLabelText(/^salary\s*\*$/i),
  date: () => screen.getByLabelText(/^date of joining\s*\*$/i),
  file: () => screen.getByLabelText('Profile picture file'),
  save: () => screen.getByRole('button', { name: /^save changes$|^saving/i }),
};

const jane = makeEmployee({ _id: 'e1', profile_picture: '/uploads/jane.png' });

// Serves the employee on GET and lets a test decide how PUT is answered.
function backend(onPut?: (config: InternalAxiosRequestConfig) => { status: number; data?: unknown }) {
  const puts: InternalAxiosRequestConfig[] = [];
  fakeServer((config) => {
    if (config.method === 'put') {
      puts.push(config);
      return onPut?.(config) ?? { status: 200, data: jane };
    }
    return { status: 200, data: jane };
  });
  return puts;
}

describe('EditEmployeePage: loading', () => {
  it('shows a loading state, then the form filled with the employee', async () => {
    backend();
    renderEdit();

    expect(screen.getByRole('status')).toHaveTextContent('Loading employee…');
    expect(await screen.findByDisplayValue('Jane')).toBeInTheDocument();
    expect(field.salary()).toHaveValue('85000');
    expect(field.date()).toHaveValue('2024-03-01');
    expect(screen.getByRole('heading', { name: 'Edit employee', level: 1 })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Current picture of Jane Doe' })).toBeInTheDocument();
  });

  it("another user's employee (403): access denied, and no form", async () => {
    fakeServer(() => ({ status: 403, data: { status: 'error', code: 'FORBIDDEN', message: 'You do not have permission to access this employee.' } }));
    renderEdit('someone-elses');

    expect(await screen.findByRole('heading', { name: 'Access denied' })).toBeInTheDocument();
    expect(screen.queryByLabelText(/^first name/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save changes' })).not.toBeInTheDocument();
  });

  it('an employee that does not exist (404)', async () => {
    fakeServer(() => ({ status: 404, data: { status: 'error', code: 'NOT_FOUND', message: 'Employee not found.' } }));
    renderEdit('missing');

    expect(await screen.findByRole('heading', { name: 'Not found' })).toBeInTheDocument();
    expect(screen.queryByLabelText(/^first name/i)).not.toBeInTheDocument();
  });

  it('a network failure, with a Try again button', async () => {
    fakeNetworkFailure();
    renderEdit();

    expect(await screen.findByRole('alert')).toHaveTextContent('Cannot reach the server. Check your connection and try again.');
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});

describe('EditEmployeePage: saving', () => {
  it('updates with PUT, says so, and returns to the list', async () => {
    const user = userEvent.setup();
    const puts = backend();
    renderEdit();
    await screen.findByDisplayValue('Jane');

    await user.clear(field.salary());
    await user.type(field.salary(), '91000.50');
    await user.click(field.save());

    expect(await screen.findByText('employee list screen')).toBeInTheDocument();
    expect(await screen.findByText('Changes saved.')).toBeInTheDocument();
    expect(puts).toHaveLength(1);
    expect(puts[0]).toMatchObject({ method: 'put', url: '/emp/employees/e1' });
    const sent = puts[0]?.data as FormData;
    expect(sent.get('salary')).toBe('91000.50');
    expect(sent.get('first_name')).toBe('Jane'); // the unchanged values travel along
    expect(sent.has('profile_picture')).toBe(false); // no new picture chosen: the old one stays
  });

  it('replaces the picture when a new one is chosen', async () => {
    const user = userEvent.setup({ applyAccept: false });
    const puts = backend();
    renderEdit();
    await screen.findByDisplayValue('Jane');

    await user.upload(field.file(), new File(['new'], 'new.png', { type: 'image/png' }));
    expect(await screen.findByRole('img', { name: 'Preview of the chosen picture' })).toBeInTheDocument();
    await user.click(field.save());

    await screen.findByText('employee list screen');
    expect(((puts[0]?.data as FormData).get('profile_picture') as File).name).toBe('new.png');
  });

  it('sends nothing while the form is invalid', async () => {
    const user = userEvent.setup();
    const puts = backend();
    renderEdit();
    await screen.findByDisplayValue('Jane');

    await user.clear(field.first());
    await user.click(field.save());

    expect(screen.getByText('First name is required.')).toBeInTheDocument();
    expect(field.first()).toHaveFocus();
    expect(puts).toHaveLength(0);
  });

  it('shows a conflict next to the email field and keeps the user’s changes', async () => {
    const user = userEvent.setup();
    backend(() => ({
      status: 409,
      data: {
        status: 'error',
        code: 'CONFLICT',
        message: 'You already have an employee with this email address.',
        errors: [{ field: 'email', message: 'You already have an employee with this email address.' }],
      },
    }));
    renderEdit();
    await screen.findByDisplayValue('Jane');
    await user.clear(field.email());
    await user.type(field.email(), 'taken@example.com');

    await user.click(field.save());

    expect(await screen.findByText('You already have an employee with this email address.')).toBeInTheDocument();
    expect(field.email()).toHaveFocus();
    expect(field.email()).toHaveValue('taken@example.com');
    expect(screen.queryByText('employee list screen')).not.toBeInTheDocument();
  });

  it('shows a server failure above the buttons, in plain words, and can be retried', async () => {
    const user = userEvent.setup();
    let failing = true;
    backend(() => (failing ? { status: 500, data: { status: 'error', code: 'INTERNAL_ERROR', message: 'internals' } } : { status: 200, data: jane }));
    renderEdit();
    await screen.findByDisplayValue('Jane');

    await user.click(field.save());
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('The server ran into a problem. Please try again in a moment.');
    expect(alert).not.toHaveTextContent('internals');

    failing = false;
    await user.click(field.save());
    expect(await screen.findByText('employee list screen')).toBeInTheDocument();
  });

  it('leaves for the list with a message when the employee was deleted in the meantime (404)', async () => {
    const user = userEvent.setup();
    backend(() => ({ status: 404, data: { status: 'error', code: 'NOT_FOUND', message: 'Employee not found.' } }));
    renderEdit();
    await screen.findByDisplayValue('Jane');

    await user.click(field.save());

    expect(await screen.findByText('employee list screen')).toBeInTheDocument();
    expect(await screen.findByText(/could not be found/)).toBeInTheDocument();
  });

  it('Cancel on a directly opened page goes to the list without saving', async () => {
    const user = userEvent.setup();
    const puts = backend();
    renderEdit();
    await screen.findByDisplayValue('Jane');
    fireEvent.change(field.first(), { target: { value: 'Changed' } });

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(await screen.findByText('employee list screen')).toBeInTheDocument();
    expect(puts).toHaveLength(0);
  });
});

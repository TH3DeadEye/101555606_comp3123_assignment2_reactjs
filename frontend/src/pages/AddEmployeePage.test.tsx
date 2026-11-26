import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { InternalAxiosRequestConfig } from 'axios';
import { Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { fakeNetworkFailure, fakePendingServer, fakeServer, makeEmployee, restoreServer } from '../test/helpers';
import { renderWithProviders } from '../test/render';
import AddEmployeePage from './AddEmployeePage';

afterEach(restoreServer);

const renderAdd = () =>
  renderWithProviders(
    <Routes>
      <Route path="/employees/add" element={<AddEmployeePage />} />
      <Route path="/employees" element={<p>employee list screen</p>} />
    </Routes>,
    { route: '/employees/add', authenticated: true },
  );

const field = {
  first: () => screen.getByLabelText(/^first name\s*\*$/i),
  last: () => screen.getByLabelText(/^last name\s*\*$/i),
  email: () => screen.getByLabelText(/^email\s*\*$/i),
  position: () => screen.getByLabelText(/^position\s*\*$/i),
  department: () => screen.getByLabelText(/^department\s*\*$/i),
  salary: () => screen.getByLabelText(/^salary\s*\*$/i),
  date: () => screen.getByLabelText(/^date of joining\s*\*$/i),
  file: () => screen.getByLabelText('Profile picture file'),
  submit: () => screen.getByRole('button', { name: /^add employee$|^saving/i }),
};

async function fillValid(user: ReturnType<typeof userEvent.setup>) {
  await user.type(field.first(), 'Jane');
  await user.type(field.last(), 'Doe');
  await user.type(field.email(), 'jane@example.com');
  await user.type(field.position(), 'Engineer');
  await user.type(field.department(), 'Engineering');
  await user.type(field.salary(), '85000.50');
  fireEvent.change(field.date(), { target: { value: '2024-03-01' } });
}

const created = makeEmployee({ _id: 'new-1', first_name: 'Jane', last_name: 'Doe' });

describe('AddEmployeePage', () => {
  it('has a heading, a link back to the list and the form', () => {
    renderAdd();

    expect(screen.getByRole('heading', { name: 'Add employee', level: 1 })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to employees' })).toHaveAttribute('href', '/employees');
    expect(field.first()).toBeInTheDocument();
  });

  it('creates the employee as multipart form data, says so, and returns to the list', async () => {
    const user = userEvent.setup({ applyAccept: false });
    let request: InternalAxiosRequestConfig | undefined;
    fakeServer((config) => {
      request = config;
      return { status: 201, data: created };
    });
    renderAdd();

    await fillValid(user);
    await user.upload(field.file(), new File(['abc'], 'me.png', { type: 'image/png' }));
    await user.click(field.submit());

    expect(await screen.findByText('employee list screen')).toBeInTheDocument();
    expect(await screen.findByText('Jane Doe was added.')).toBeInTheDocument();
    expect(request).toMatchObject({ method: 'post', url: '/emp/employees' });
    const sent = request?.data as FormData;
    expect(sent).toBeInstanceOf(FormData);
    expect(Object.fromEntries([...sent.entries()].filter(([, value]) => typeof value === 'string'))).toEqual({
      first_name: 'Jane',
      last_name: 'Doe',
      email: 'jane@example.com',
      position: 'Engineer',
      department: 'Engineering',
      salary: '85000.50',
      date_of_joining: '2024-03-01',
    });
    expect((sent.get('profile_picture') as File).name).toBe('me.png');
  });

  it('sends nothing and stays here while the form is invalid', async () => {
    const user = userEvent.setup();
    let calls = 0;
    fakeServer(() => {
      calls += 1;
      return { status: 201, data: created };
    });
    renderAdd();

    await user.click(field.submit());

    expect(screen.getByText('First name is required.')).toBeInTheDocument();
    expect(calls).toBe(0);
    expect(screen.queryByText('employee list screen')).not.toBeInTheDocument();
  });

  it('shows "email already used" next to the email field and stays on the page', async () => {
    const user = userEvent.setup();
    fakeServer(() => ({
      status: 409,
      data: {
        status: 'error',
        code: 'CONFLICT',
        message: 'You already have an employee with this email address.',
        errors: [{ field: 'email', message: 'You already have an employee with this email address.' }],
      },
    }));
    renderAdd();
    await fillValid(user);

    await user.click(field.submit());

    expect(await screen.findByText('You already have an employee with this email address.')).toBeInTheDocument();
    expect(field.email()).toHaveFocus();
    expect(screen.queryByText('employee list screen')).not.toBeInTheDocument();
    expect(field.first()).toHaveValue('Jane'); // nothing the user typed was lost
  });

  it('shows a rejected picture (413) next to the picture control', async () => {
    const user = userEvent.setup({ applyAccept: false });
    fakeServer(() => ({ status: 413, data: { status: 'error', code: 'FILE_TOO_LARGE', message: 'The picture is too large.' } }));
    renderAdd();
    await fillValid(user);
    await user.upload(field.file(), new File(['abc'], 'me.png', { type: 'image/png' }));

    await user.click(field.submit());

    expect(await screen.findByRole('alert')).toHaveTextContent('The picture is too large. The maximum size is 2 MB.');
  });

  it('explains a network failure and lets the user try again', async () => {
    const user = userEvent.setup();
    fakeNetworkFailure();
    renderAdd();
    await fillValid(user);

    await user.click(field.submit());

    expect(await screen.findByRole('alert')).toHaveTextContent('Cannot reach the server. Check your connection and try again.');
    expect(field.submit()).toBeEnabled();
  });

  it('locks the form while saving', async () => {
    const user = userEvent.setup();
    fakePendingServer();
    renderAdd();
    await fillValid(user);

    await user.click(field.submit());

    expect(await screen.findByRole('button', { name: 'Saving…' })).toBeDisabled();
    expect(field.first()).toBeDisabled();
  });

  it('Cancel goes back to the list without saving', async () => {
    const user = userEvent.setup();
    renderAdd();

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(await screen.findByText('employee list screen')).toBeInTheDocument();
  });
});

import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { API_ORIGIN } from '../api/client';
import { makeEmployee } from '../test/helpers';
import { MAX_PICTURE_BYTES } from '../utils/employeeValidation';
import type { AppError } from '../utils/errors';
import { EmployeeForm } from './EmployeeForm';

// Required fields have a label like "First name *", so the patterns end with the asterisk.
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

type Props = ComponentProps<typeof EmployeeForm>;

const onSubmit = vi.fn();
const onCancel = vi.fn();
const form = (props: Partial<Props> = {}) => (
  <EmployeeForm submitLabel="Add employee" isSubmitting={false} serverError={null} onSubmit={onSubmit} onCancel={onCancel} {...props} />
);
const setup = () => userEvent.setup({ applyAccept: false }); // the file chooser's filter can be bypassed

async function fillValid(user: ReturnType<typeof setup>) {
  await user.type(field.first(), 'Jane');
  await user.type(field.last(), 'Doe');
  await user.type(field.email(), 'jane@example.com');
  await user.type(field.position(), 'Engineer');
  await user.type(field.department(), 'Engineering');
  await user.type(field.salary(), '85000');
  fireEvent.change(field.date(), { target: { value: '2024-03-01' } });
}

const validInput = {
  first_name: 'Jane',
  last_name: 'Doe',
  email: 'jane@example.com',
  position: 'Engineer',
  department: 'Engineering',
  salary: '85000',
  date_of_joining: '2024-03-01',
};

const appError = (overrides: Partial<AppError>): AppError => ({
  kind: 'validation',
  status: 400,
  code: 'VALIDATION_ERROR',
  message: 'Please correct the highlighted fields and try again.',
  fieldErrors: {},
  retryAfterSeconds: null,
  ...overrides,
});

const png = (name = 'me.png') => new File(['abc'], name, { type: 'image/png' });

describe('EmployeeForm: the fields', () => {
  it('starts empty when adding, with every field required', () => {
    onSubmit.mockClear();
    render(form());

    for (const input of [field.first(), field.last(), field.email(), field.position(), field.department(), field.salary(), field.date()]) {
      expect(input).toBeRequired();
      expect(input).toHaveValue('');
    }
    expect(screen.getByRole('button', { name: 'Add employee' })).toBeInTheDocument();
  });

  it('starts with the employee’s values when editing, including the picture', () => {
    render(form({ initial: makeEmployee({ profile_picture: '/uploads/old.png' }), submitLabel: 'Save changes' }));

    expect(field.first()).toHaveValue('Jane');
    expect(field.last()).toHaveValue('Doe');
    expect(field.email()).toHaveValue('jane.doe@example.com');
    expect(field.salary()).toHaveValue('85000');
    expect(field.date()).toHaveValue('2024-03-01'); // the stored UTC date, not shifted by the time zone
    expect(screen.getByRole('img', { name: 'Current picture of Jane Doe' })).toHaveAttribute('src', `${API_ORIGIN}/uploads/old.png`);
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeInTheDocument();
  });

  it('is controlled: the inputs show what was typed', async () => {
    const user = setup();
    render(form());

    await user.type(field.first(), 'Anne-Marie');

    expect(field.first()).toHaveValue('Anne-Marie');
  });
});

describe('EmployeeForm: validation before sending', () => {
  it('shows every missing value, sends nothing, and focuses the first problem', async () => {
    const user = setup();
    onSubmit.mockClear();
    render(form());

    await user.click(field.submit());

    for (const message of [
      'First name is required.',
      'Last name is required.',
      'Email is required.',
      'Position is required.',
      'Department is required.',
      'Salary is required.',
      'Date of joining is required.',
    ]) {
      expect(screen.getByText(message)).toBeInTheDocument();
    }
    expect(field.first()).toHaveFocus();
    expect(field.first()).toBeInvalid();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('explains specific mistakes in plain words', async () => {
    const user = setup();
    render(form());

    await user.type(field.first(), '<script>');
    await user.type(field.email(), 'nope');
    await user.type(field.salary(), 'abc');
    await user.type(field.department(), 'x');
    await user.click(field.submit());

    expect(screen.getByText('First name can only contain letters, spaces, dots, apostrophes and hyphens.')).toBeInTheDocument();
    expect(screen.getByText('Enter a valid email address.')).toBeInTheDocument();
    expect(screen.getByText('Salary must be a number, for example 55000 or 55000.50.')).toBeInTheDocument();
    expect(screen.getByText('Department must be at least 2 characters.')).toBeInTheDocument();
  });

  it('flags a field when the user leaves it, and clears the message once it is fixed', async () => {
    const user = setup();
    render(form());

    await user.type(field.salary(), '-5');
    await user.tab();
    expect(await screen.findByText('Salary must be greater than 0.')).toBeInTheDocument();

    await user.clear(field.salary());
    await user.type(field.salary(), '50000');
    expect(screen.queryByText('Salary must be greater than 0.')).not.toBeInTheDocument();
    expect(field.salary()).not.toBeInvalid();
  });

  it('rejects a date that does not exist', async () => {
    const user = setup();
    render(form());
    await fillValid(user);

    fireEvent.change(field.date(), { target: { value: '2024-02-31' } });
    await user.click(field.submit());

    // The browser itself refuses an impossible date and leaves the box empty.
    expect(screen.getByText('Date of joining is required.')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

describe('EmployeeForm: sending', () => {
  it('passes the values to onSubmit when everything is valid (no picture)', async () => {
    const user = setup();
    onSubmit.mockClear();
    render(form());

    await fillValid(user);
    await user.click(field.submit());

    expect(onSubmit).toHaveBeenCalledExactlyOnceWith(validInput, null);
  });

  it('sends only what the user changed when editing, with the other values kept', async () => {
    const user = setup();
    onSubmit.mockClear();
    render(form({ initial: makeEmployee(), submitLabel: 'Save changes' }));

    await user.clear(field.salary());
    await user.type(field.salary(), '91000.50');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(onSubmit).toHaveBeenCalledWith(
      {
        first_name: 'Jane',
        last_name: 'Doe',
        email: 'jane.doe@example.com',
        position: 'Software Engineer',
        department: 'Engineering',
        salary: '91000.50',
        date_of_joining: '2024-03-01',
      },
      null,
    );
  });

  it('calls onCancel from the Cancel button', async () => {
    const user = setup();
    onCancel.mockClear();
    render(form());

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('shows the saving state and blocks changes and double submits', () => {
    render(form({ isSubmitting: true }));

    expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled();
    expect(field.first()).toBeDisabled();
    expect(field.date()).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Choose picture' })).toBeDisabled();
  });
});

describe('EmployeeForm: the profile picture', () => {
  it('previews a chosen picture and sends it with the form', async () => {
    const user = setup();
    onSubmit.mockClear();
    render(form());
    const file = png();

    await user.upload(field.file(), file);
    expect(await screen.findByRole('img', { name: 'Preview of the chosen picture' })).toBeInTheDocument();
    await fillValid(user);
    await user.click(field.submit());

    expect(onSubmit).toHaveBeenCalledWith(validInput, file);
  });

  it('refuses a file of the wrong type, with a message, and does not send it', async () => {
    const user = setup();
    onSubmit.mockClear();
    render(form());

    await user.upload(field.file(), new File(['hello'], 'notes.txt', { type: 'text/plain' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Only JPEG, PNG and WebP pictures are allowed.');
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    await fillValid(user);
    await user.click(field.submit());
    expect(onSubmit).toHaveBeenCalledWith(validInput, null);
  });

  it('refuses a file over 2 MB and says how big it was', async () => {
    const user = setup();
    render(form());
    const big = new File([new Uint8Array(MAX_PICTURE_BYTES + 1)], 'big.png', { type: 'image/png' });

    await user.upload(field.file(), big);

    expect(await screen.findByRole('alert')).toHaveTextContent('The picture is too large (2.0 MB). The maximum size is 2 MB.');
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('keeps an earlier valid picture when a later choice is refused', async () => {
    const user = setup();
    onSubmit.mockClear();
    render(form());
    const good = png('good.png');

    await user.upload(field.file(), good);
    await screen.findByRole('img', { name: 'Preview of the chosen picture' });
    await user.upload(field.file(), new File(['x'], 'bad.gif', { type: 'image/gif' }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Preview of the chosen picture' })).toBeInTheDocument();
    await fillValid(user);
    await user.click(field.submit());
    expect(onSubmit).toHaveBeenCalledWith(validInput, good);
  });

  it('clears the message once a valid picture is chosen, and the choice can be removed', async () => {
    const user = setup();
    onSubmit.mockClear();
    render(form());
    await user.upload(field.file(), new File(['x'], 'bad.gif', { type: 'image/gif' }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();

    await user.upload(field.file(), png());
    await screen.findByRole('img', { name: 'Preview of the chosen picture' });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Remove selected picture' }));
    await fillValid(user);
    await user.click(field.submit());
    expect(onSubmit).toHaveBeenCalledWith(validInput, null);
  });
});

describe('EmployeeForm: what the server says', () => {
  it('shows a field message from the backend, focuses that field, and clears it when edited', async () => {
    const user = setup();
    const { rerender } = render(form());
    await fillValid(user);

    rerender(
      form({
        serverError: appError({
          kind: 'conflict',
          status: 409,
          code: 'CONFLICT',
          message: 'You already have an employee with this email address.',
          fieldErrors: { email: ['You already have an employee with this email address.'] },
        }),
      }),
    );

    expect(await screen.findByText('You already have an employee with this email address.')).toBeInTheDocument();
    expect(field.email()).toBeInvalid();
    expect(field.email()).toHaveFocus();
    expect(screen.queryByText('Please correct the highlighted fields and try again.')).not.toBeInTheDocument(); // no second, vaguer alert

    await user.type(field.email(), 'x');
    expect(screen.queryByText('You already have an employee with this email address.')).not.toBeInTheDocument();
  });

  it('shows a problem that belongs to no field above the buttons', () => {
    render(form({ serverError: appError({ kind: 'network', status: null, code: 'ERR_NETWORK', message: 'Cannot reach the server. Check your connection and try again.' }) }));

    expect(screen.getByRole('alert')).toHaveTextContent('Cannot reach the server. Check your connection and try again.');
  });

  it('shows a refused picture next to the picture control', () => {
    const message = 'The picture is too large. The maximum size is 2 MB.';
    render(form({ serverError: appError({ kind: 'file', status: 413, code: 'FILE_TOO_LARGE', message, fieldErrors: { profile_picture: [message] } }) }));

    expect(screen.getByRole('alert')).toHaveTextContent(message);
    expect(screen.getByLabelText('Profile picture file')).toHaveAccessibleDescription(message);
  });
});

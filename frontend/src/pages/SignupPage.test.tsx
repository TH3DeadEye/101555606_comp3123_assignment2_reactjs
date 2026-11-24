import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fakeNetworkFailure, fakePendingServer, fakeServer, restoreServer } from '../test/helpers';
import { renderWithProviders } from '../test/render';
import SignupPage from './SignupPage';

// Stands in for the login screen and shows what SignupPage passed to it.
function LoginProbe() {
  const state = useLocation().state as { registeredUsername?: string } | null;
  return <p>login screen, registered: {state?.registeredUsername ?? 'nobody'}</p>;
}

const renderSignup = () =>
  renderWithProviders(
    <Routes>
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/login" element={<LoginProbe />} />
    </Routes>,
    { route: '/signup' },
  );

// Required fields have a label like "Password *", so the patterns end with the
// asterisk. That keeps "Password" from also matching "Password requirements".
const field = {
  username: () => screen.getByLabelText(/^username\s*\*$/i),
  email: () => screen.getByLabelText(/^email\s*\*$/i),
  password: () => screen.getByLabelText(/^password\s*\*$/i),
  confirm: () => screen.getByLabelText(/^confirm password\s*\*$/i),
  submit: () => screen.getByRole('button', { name: /create account|creating account/i }),
};

async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(field.username(), '  Alice_01 ');
  await user.type(field.email(), ' alice@example.com ');
  await user.type(field.password(), 'Str0ng!Pass');
  await user.type(field.confirm(), 'Str0ng!Pass');
}

afterEach(restoreServer);

describe('SignupPage: the form', () => {
  it('has a heading, labelled fields and a link to the login page', () => {
    renderSignup();

    expect(screen.getByRole('heading', { name: 'Sign up' })).toBeInTheDocument();
    for (const input of [field.username(), field.email(), field.password(), field.confirm()]) expect(input).toBeRequired();
    expect(screen.getByRole('link', { name: 'Log in' })).toHaveAttribute('href', '/login');
  });

  it('is controlled: what is typed is what the inputs show', async () => {
    const user = userEvent.setup();
    renderSignup();

    await user.type(field.username(), 'alice');
    await user.type(field.email(), 'alice@example.com');

    expect(field.username()).toHaveValue('alice');
    expect(field.email()).toHaveValue('alice@example.com');
  });

  it('ticks off the password requirements while typing', async () => {
    const user = userEvent.setup();
    renderSignup();
    const list = screen.getByRole('list', { name: 'Password requirements' });
    expect(within(list).getByText(/At least 8 characters/).closest('li')).toHaveTextContent('(not met yet)');

    await user.type(field.password(), 'Str0ng!Pass');

    for (const item of within(list).getAllByRole('listitem')) expect(item).toHaveTextContent('(met)');
    expect(within(list).queryByText(/not met yet/)).not.toBeInTheDocument();
  });

  it('can show and hide the typed password', async () => {
    const user = userEvent.setup();
    renderSignup();
    expect(field.password()).toHaveAttribute('type', 'password');

    await user.click(screen.getAllByRole('button', { name: 'Show password' })[0]!);
    expect(field.password()).toHaveAttribute('type', 'text');

    await user.click(screen.getAllByRole('button', { name: 'Hide password' })[0]!);
    expect(field.password()).toHaveAttribute('type', 'password');
  });
});

describe('SignupPage: client-side validation', () => {
  it('shows every problem and sends nothing when the empty form is submitted', async () => {
    const user = userEvent.setup();
    const server = vi.fn(() => ({ status: 201, data: {} }));
    fakeServer(server);
    renderSignup();

    await user.click(field.submit());

    expect(screen.getByText('Username is required.')).toBeInTheDocument();
    expect(screen.getByText('Email is required.')).toBeInTheDocument();
    expect(screen.getByText('Password is required.')).toBeInTheDocument();
    expect(screen.getByText('Please repeat the password.')).toBeInTheDocument();
    expect(server).not.toHaveBeenCalled();
  });

  it('moves the focus to the first invalid field', async () => {
    const user = userEvent.setup();
    renderSignup();

    await user.click(field.submit());

    expect(field.username()).toHaveFocus();
    expect(field.username()).toBeInvalid();
  });

  it('flags a bad email when the user leaves the field', async () => {
    const user = userEvent.setup();
    renderSignup();

    await user.type(field.email(), 'not-an-email');
    await user.tab();

    expect(await screen.findByText('Enter a valid email address.')).toBeInTheDocument();
    expect(field.email()).toBeInvalid();
  });

  it('flags a confirmation that does not match', async () => {
    const user = userEvent.setup();
    renderSignup();

    await user.type(field.password(), 'Str0ng!Pass');
    await user.type(field.confirm(), 'Str0ng!Pas');
    await user.tab();

    expect(await screen.findByText('The passwords do not match.')).toBeInTheDocument();
  });
});

describe('SignupPage: talking to the backend', () => {
  it('sends the trimmed values, then goes to the login page', async () => {
    const user = userEvent.setup();
    let sent: unknown;
    fakeServer((config) => {
      sent = JSON.parse(String(config.data));
      return { status: 201, data: { message: 'User registered successfully.', user: {} } };
    });
    renderSignup();

    await fillValidForm(user);
    await user.click(field.submit());

    expect(await screen.findByText('login screen, registered: alice_01')).toBeInTheDocument();
    expect(sent).toEqual({ username: 'Alice_01', email: 'alice@example.com', password: 'Str0ng!Pass' });
  });

  it('disables the form while the request is in progress', async () => {
    const user = userEvent.setup();
    fakePendingServer();
    renderSignup();

    await fillValidForm(user);
    await user.click(field.submit());

    expect(await screen.findByRole('button', { name: 'Creating account…' })).toBeDisabled();
    expect(field.username()).toBeDisabled();
  });

  it('shows "user already exists" next to the username and focuses it', async () => {
    const user = userEvent.setup();
    fakeServer(() => ({
      status: 409,
      data: {
        status: 'error',
        code: 'CONFLICT',
        message: 'That username is already taken.',
        errors: [{ field: 'username', message: 'That username is already taken.' }],
      },
    }));
    renderSignup();

    await fillValidForm(user);
    await user.click(field.submit());

    expect(await screen.findByText('That username is already taken.')).toBeInTheDocument();
    expect(field.username()).toBeInvalid();
    expect(field.username()).toHaveFocus();
    expect(field.submit()).toBeEnabled(); // the user can fix it and try again

    await user.type(field.username(), '2'); // editing clears the server message
    expect(screen.queryByText('That username is already taken.')).not.toBeInTheDocument();
  });

  it('shows the backend validation message for an email it rejects', async () => {
    const user = userEvent.setup();
    fakeServer(() => ({
      status: 409,
      data: {
        status: 'error',
        code: 'CONFLICT',
        message: 'That email address is already registered.',
        errors: [{ field: 'email', message: 'That email address is already registered.' }],
      },
    }));
    renderSignup();

    await fillValidForm(user);
    await user.click(field.submit());

    expect(await screen.findByText('That email address is already registered.')).toBeInTheDocument();
    expect(field.email()).toBeInvalid();
  });

  it('explains a rate limit, including how long to wait', async () => {
    const user = userEvent.setup();
    fakeServer(() => ({
      status: 429,
      data: { status: 'error', code: 'RATE_LIMITED', message: 'Too many sign-up attempts', retry_after_seconds: 899 },
    }));
    renderSignup();

    await fillValidForm(user);
    await user.click(field.submit());

    expect(await screen.findByRole('alert')).toHaveTextContent('Too many attempts. Please wait 15 minutes and try again.');
  });

  it('explains a network failure without technical words', async () => {
    const user = userEvent.setup();
    fakeNetworkFailure();
    renderSignup();

    await fillValidForm(user);
    await user.click(field.submit());

    expect(await screen.findByRole('alert')).toHaveTextContent('Cannot reach the server. Check your connection and try again.');
    expect(field.submit()).toBeEnabled();
  });
});

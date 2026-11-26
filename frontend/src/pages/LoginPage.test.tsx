import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthContext, type AuthContextValue } from '../context/AuthContext';
import { fakeNetworkFailure, fakePendingServer, fakeServer, makeJwt, restoreServer, testUser } from '../test/helpers';
import { renderWithProviders } from '../test/render';
import LoginPage from './LoginPage';

const renderLogin = (route: string | { pathname: string; state?: unknown } = '/login') =>
  renderWithProviders(
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/employees" element={<p>employee list screen</p>} />
    </Routes>,
    { route },
  );

const field = {
  identifier: () => screen.getByLabelText(/^username or email\s*\*$/i),
  password: () => screen.getByLabelText(/^password\s*\*$/i),
  submit: () => screen.getByRole('button', { name: /^log in$|^logging in/i }),
};

const loginOk = () => ({
  status: 200,
  data: { message: 'Login successful.', token: makeJwt(), user: testUser },
});

afterEach(restoreServer);

describe('LoginPage: the form', () => {
  it('has a heading, labelled fields and a link to sign up', () => {
    renderLogin();

    expect(screen.getByRole('heading', { name: 'Log in' })).toBeInTheDocument();
    expect(field.identifier()).toBeRequired();
    expect(field.password()).toBeRequired();
    expect(screen.getByRole('link', { name: 'Create an account' })).toHaveAttribute('href', '/signup');
  });

  it('does not apply the signup password rules to the login password', async () => {
    const user = userEvent.setup();
    const server = vi.fn(() => ({ status: 401, data: { status: 'error', code: 'INVALID_CREDENTIALS' } }));
    fakeServer(server);
    renderLogin();

    await user.type(field.identifier(), 'alice');
    await user.type(field.password(), 'weak'); // would fail the signup rules
    await user.click(field.submit());

    expect(server).toHaveBeenCalledTimes(1); // it was sent to the server, not stopped by the form
  });
});

describe('LoginPage: client-side validation', () => {
  it('asks for both values, sends nothing, and focuses the first empty field', async () => {
    const user = userEvent.setup();
    const server = vi.fn(loginOk);
    fakeServer(server);
    renderLogin();

    await user.click(field.submit());

    expect(screen.getByText('Enter your username or email address.')).toBeInTheDocument();
    expect(screen.getByText('Enter your password.')).toBeInTheDocument();
    expect(field.identifier()).toHaveFocus();
    expect(server).not.toHaveBeenCalled();
  });
});

describe('LoginPage: logging in', () => {
  it('logs in with a username, stores the session and opens the employee list', async () => {
    const user = userEvent.setup();
    let sent: unknown;
    fakeServer((config) => {
      sent = JSON.parse(String(config.data));
      return loginOk();
    });
    renderLogin();

    await user.type(field.identifier(), '  alice ');
    await user.type(field.password(), 'Str0ng!Pass');
    await user.click(field.submit());

    expect(await screen.findByText('employee list screen')).toBeInTheDocument();
    expect(sent).toEqual({ username: 'alice', password: 'Str0ng!Pass' });
    expect(localStorage.getItem('token')).not.toBeNull();
  });

  it('logs in with an email when the text contains @', async () => {
    const user = userEvent.setup();
    let sent: unknown;
    fakeServer((config) => {
      sent = JSON.parse(String(config.data));
      return loginOk();
    });
    renderLogin();

    await user.type(field.identifier(), 'alice@example.com');
    await user.type(field.password(), 'Str0ng!Pass');
    await user.click(field.submit());

    expect(await screen.findByText('employee list screen')).toBeInTheDocument();
    expect(sent).toEqual({ email: 'alice@example.com', password: 'Str0ng!Pass' });
  });

  it('disables the form while the request is in progress', async () => {
    const user = userEvent.setup();
    fakePendingServer();
    renderLogin();

    await user.type(field.identifier(), 'alice');
    await user.type(field.password(), 'Str0ng!Pass');
    await user.click(field.submit());

    expect(await screen.findByRole('button', { name: 'Logging in…' })).toBeDisabled();
    expect(field.identifier()).toBeDisabled();
  });
});

describe('LoginPage: things that go wrong', () => {
  async function submitCredentials(user: ReturnType<typeof userEvent.setup>) {
    await user.type(field.identifier(), 'alice');
    await user.type(field.password(), 'Str0ng!Pass');
    await user.click(field.submit());
  }

  it('shows "invalid credentials" without saying which part was wrong', async () => {
    const user = userEvent.setup();
    fakeServer(() => ({ status: 401, data: { status: 'error', code: 'INVALID_CREDENTIALS', message: 'Invalid username/email or password.' } }));
    renderLogin();

    await submitCredentials(user);

    expect(await screen.findByRole('alert')).toHaveTextContent('Incorrect username/email or password.');
    expect(field.identifier()).not.toBeInvalid();
    expect(field.password()).not.toBeInvalid();
    expect(field.submit()).toBeEnabled();
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('explains a rate limit and how long to wait', async () => {
    const user = userEvent.setup();
    fakeServer(() => ({ status: 429, data: { status: 'error', code: 'RATE_LIMITED', message: 'Too many', retry_after_seconds: 540 } }));
    renderLogin();

    await submitCredentials(user);

    expect(await screen.findByRole('alert')).toHaveTextContent('Too many attempts. Please wait 9 minutes and try again.');
  });

  it('explains a network failure', async () => {
    const user = userEvent.setup();
    fakeNetworkFailure();
    renderLogin();

    await submitCredentials(user);

    expect(await screen.findByRole('alert')).toHaveTextContent('Cannot reach the server. Check your connection and try again.');
  });

  it('hides a server error as soon as the user edits a field', async () => {
    const user = userEvent.setup();
    fakeServer(() => ({ status: 401, data: { status: 'error', code: 'INVALID_CREDENTIALS' } }));
    renderLogin();
    await submitCredentials(user);
    expect(await screen.findByRole('alert')).toBeInTheDocument();

    await user.type(field.password(), '!');

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

describe('LoginPage: notices', () => {
  it('welcomes a newly registered user and fills in their username', () => {
    renderLogin({ pathname: '/login', state: { registeredUsername: 'alice' } });

    expect(screen.getByText('Your account has been created. Log in to get started.')).toBeInTheDocument();
    expect(field.identifier()).toHaveValue('alice');
  });

  it.each([
    ['expired', 'Your session has expired. Please log in again.'],
    ['invalid', 'Your session is no longer valid. Please log in again.'],
  ] as const)('tells the user when the session ended because it was %s', (reason, message) => {
    const value: AuthContextValue = { user: null, isAuthenticated: false, sessionNotice: reason, login: vi.fn(), logout: vi.fn() };
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={['/login']}>
          <AuthContext.Provider value={value}>
            <LoginPage />
          </AuthContext.Provider>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.getByText(message)).toBeInTheDocument();
  });
});

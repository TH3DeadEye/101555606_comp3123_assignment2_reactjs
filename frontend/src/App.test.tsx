import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from './App';
import { renderWithProviders } from './test/render';

const heading = (name: string | RegExp) => screen.findByRole('heading', { name });

describe('routing for visitors who are not logged in', () => {
  it.each(['/employees', '/employees/add', '/employees/abc123', '/employees/abc123/edit', '/'])(
    'sends %s to the login page',
    async (route) => {
      renderWithProviders(<App />, { route });
      expect(await heading('Log in')).toBeInTheDocument();
    },
  );

  it('lets them open the login and signup pages', async () => {
    renderWithProviders(<App />, { route: '/signup' });
    expect(await heading('Sign up')).toBeInTheDocument();
  });
});

describe('routing for logged-in users', () => {
  it.each(['/login', '/signup', '/'])('sends %s to the employee list', async (route) => {
    renderWithProviders(<App />, { route, authenticated: true });
    expect(await heading('Employees')).toBeInTheDocument();
  });

  it('opens every employee screen', async () => {
    renderWithProviders(<App />, { route: '/employees/add', authenticated: true });
    expect(await heading('Add employee')).toBeInTheDocument();
  });
});

describe('unknown URLs', () => {
  it.each([false, true])('show the Not Found page (logged in: %s)', async (authenticated) => {
    renderWithProviders(<App />, { route: '/no/such/page', authenticated });

    expect(await heading('Page not found')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: authenticated ? 'Back to employees' : 'Go to log in' })).toBeInTheDocument();
  });
});

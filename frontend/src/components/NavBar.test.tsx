import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '../test/render';
import { NavBar } from './NavBar';

const app = (
  <>
    <NavBar />
    <Routes>
      <Route path="/login" element={<p>login page</p>} />
      <Route path="*" element={<p>some page</p>} />
    </Routes>
  </>
);

describe('NavBar when logged out', () => {
  it('offers Log in and Sign up, and nothing private', () => {
    renderWithProviders(app, { route: '/login' });

    expect(screen.getByRole('link', { name: 'Log in' })).toHaveAttribute('href', '/login');
    expect(screen.getByRole('link', { name: 'Sign up' })).toHaveAttribute('href', '/signup');
    expect(screen.queryByRole('button', { name: 'Log out' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Employees' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Add employee' })).not.toBeInTheDocument();
  });

  it('sends the title link to the login page', () => {
    renderWithProviders(app, { route: '/login' });
    expect(screen.getByRole('link', { name: 'Employee Management App' })).toHaveAttribute('href', '/login');
  });
});

describe('NavBar when logged in', () => {
  it('shows the employee links, the user name and a Log out button', () => {
    renderWithProviders(app, { route: '/employees', authenticated: true });

    expect(screen.getByRole('link', { name: 'Employees' })).toHaveAttribute('href', '/employees');
    expect(screen.getByRole('link', { name: 'Add employee' })).toHaveAttribute('href', '/employees/add');
    expect(screen.getByText('alice')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Log out' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Sign up' })).not.toBeInTheDocument();
  });

  it('marks the current page for assistive technology', () => {
    renderWithProviders(app, { route: '/employees/add', authenticated: true });

    expect(screen.getByRole('link', { name: 'Add employee' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Employees' })).not.toHaveAttribute('aria-current', 'page');
  });

  it('logs out: clears the session, goes to /login and says so', async () => {
    renderWithProviders(app, { route: '/employees', authenticated: true });

    await userEvent.click(screen.getByRole('button', { name: 'Log out' }));

    expect(await screen.findByText('login page')).toBeInTheDocument();
    expect(localStorage.getItem('token')).toBeNull();
    expect(screen.getByRole('link', { name: 'Log in' })).toBeInTheDocument(); // the bar switched back
    expect(await screen.findByText('You have been logged out.')).toBeInTheDocument();
  });

  it('has a menu button for narrow screens that lists the same options', async () => {
    renderWithProviders(app, { route: '/employees', authenticated: true });

    // jsdom ignores media queries and treats this button as display:none, which
    // gives it an empty accessible name, so it is found by its label instead.
    // A real browser shows it below the "sm" breakpoint (checked by screenshot).
    await userEvent.click(screen.getByLabelText('Open menu'));

    expect(await screen.findByRole('menuitem', { name: 'Add employee' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Log out' })).toBeInTheDocument();
  });
});

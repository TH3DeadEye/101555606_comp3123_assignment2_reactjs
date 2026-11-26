import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Link, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '../test/render';
import { AppLayout } from './AppLayout';

const app = (
  <Routes>
    <Route element={<AppLayout />}>
      <Route
        path="/one"
        element={
          <>
            <h1>page one</h1>
            <Link to="/two">go to two</Link>
          </>
        }
      />
      <Route path="/two" element={<h1>page two</h1>} />
    </Route>
  </Routes>
);

describe('AppLayout', () => {
  it('has a skip link that points at the main area', () => {
    renderWithProviders(app, { route: '/one' });

    expect(screen.getByRole('link', { name: 'Skip to main content' })).toHaveAttribute('href', '#main-content');
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main-content');
  });

  it('does not steal the focus when the first page loads', async () => {
    renderWithProviders(app, { route: '/one' });
    await screen.findByRole('heading', { name: 'page one' });

    expect(screen.getByRole('main')).not.toHaveFocus();
  });

  it('moves the focus into the main area after navigating to another page', async () => {
    const user = userEvent.setup();
    renderWithProviders(app, { route: '/one' });

    await user.click(await screen.findByRole('link', { name: 'go to two' }));

    expect(await screen.findByRole('heading', { name: 'page two' })).toBeInTheDocument();
    expect(screen.getByRole('main')).toHaveFocus();
  });
});

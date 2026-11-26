import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import type { AppError } from '../utils/errors';
import { EmptyState, ErrorState, LoadingState } from './StateMessages';

const appError = (overrides: Partial<AppError>): AppError => ({
  kind: 'server',
  status: 500,
  code: null,
  message: 'The server ran into a problem. Please try again in a moment.',
  fieldErrors: {},
  retryAfterSeconds: null,
  ...overrides,
});

const renderInRouter = (ui: React.ReactElement) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe('LoadingState', () => {
  it('announces itself politely to screen readers', () => {
    render(<LoadingState label="Loading employees…" />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading employees…');
  });
});

describe('EmptyState', () => {
  it('shows a title, a message and an action', () => {
    render(<EmptyState title="No employees yet" message="Add your first employee." action={<button>Add</button>} />);

    expect(screen.getByRole('heading', { name: 'No employees yet' })).toBeInTheDocument();
    expect(screen.getByText('Add your first employee.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument();
  });
});

describe('ErrorState', () => {
  it('offers "Try again" for a problem that can go away by itself', async () => {
    const onRetry = vi.fn();
    renderInRouter(<ErrorState error={appError({ kind: 'network', message: 'Cannot reach the server.' })} onRetry={onRetry} />);

    expect(screen.getByRole('alert')).toHaveTextContent('Cannot reach the server.');
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('does not offer a pointless retry for "forbidden" and "not found"', () => {
    renderInRouter(
      <ErrorState
        error={appError({ kind: 'forbidden', status: 403, message: "You don't have access to this employee." })}
        onRetry={() => undefined}
        backTo={{ to: '/employees', label: 'Back to employees' }}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Access denied' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to employees' })).toHaveAttribute('href', '/employees');
  });

  it('titles a missing employee "Not found"', () => {
    renderInRouter(<ErrorState error={appError({ kind: 'not-found', status: 404, message: 'That employee could not be found.' })} />);
    expect(screen.getByRole('heading', { name: 'Not found' })).toBeInTheDocument();
  });
});

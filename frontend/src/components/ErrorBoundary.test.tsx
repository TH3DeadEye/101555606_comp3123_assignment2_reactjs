import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ErrorBoundary } from './ErrorBoundary';

function Boom(): never {
  throw new Error('render bug with a secret token abc123');
}

let consoleError: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined); // React logs the crash too
});
afterEach(() => consoleError.mockRestore());

describe('ErrorBoundary', () => {
  it('renders its children when nothing is wrong', () => {
    render(
      <ErrorBoundary>
        <p>all good</p>
      </ErrorBoundary>,
    );
    expect(screen.getByText('all good')).toBeInTheDocument();
  });

  it('replaces a crashed page with a friendly message instead of a blank screen', () => {
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong');
    expect(screen.getByRole('button', { name: 'Reload page' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to the start page' })).toHaveAttribute('href', '/');
  });

  it('never shows the technical error to the user', () => {
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );

    expect(document.body).not.toHaveTextContent('secret token');
    expect(document.body).not.toHaveTextContent('render bug');
  });

  it('reloads the page when asked', async () => {
    const reload = vi.fn();
    const original = window.location;
    Object.defineProperty(window, 'location', { configurable: true, value: { ...original, reload } });
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Reload page' }));

    expect(reload).toHaveBeenCalledTimes(1);
    Object.defineProperty(window, 'location', { configurable: true, value: original });
  });
});

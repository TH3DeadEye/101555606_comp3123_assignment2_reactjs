import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { useNotify } from '../hooks/useNotify';
import { NotificationProvider } from './NotificationProvider';

function Buttons() {
  const notify = useNotify();
  return (
    <>
      <button onClick={() => notify.success('Employee saved.')}>save</button>
      <button onClick={() => notify.error('Could not save the employee.')}>fail</button>
    </>
  );
}

const renderToasts = () =>
  render(
    <NotificationProvider>
      <Buttons />
    </NotificationProvider>,
  );

describe('NotificationProvider', () => {
  it('shows a success message politely (role=status)', async () => {
    renderToasts();
    await userEvent.click(screen.getByRole('button', { name: 'save' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Employee saved.');
  });

  it('shows an error message assertively (role=alert)', async () => {
    renderToasts();
    await userEvent.click(screen.getByRole('button', { name: 'fail' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not save the employee.');
  });

  it('replaces the previous message with the newest one', async () => {
    renderToasts();
    await userEvent.click(screen.getByRole('button', { name: 'save' }));
    await userEvent.click(screen.getByRole('button', { name: 'fail' }));

    expect(await screen.findByText('Could not save the employee.')).toBeInTheDocument();
    expect(screen.queryByText('Employee saved.')).not.toBeInTheDocument();
  });

  it('can be dismissed with the close button', async () => {
    renderToasts();
    await userEvent.click(screen.getByRole('button', { name: 'save' }));
    await userEvent.click(await screen.findByRole('button', { name: /close/i }));

    // the toast plays a short exit animation before it is removed
    await waitFor(() => expect(screen.queryByText('Employee saved.')).not.toBeInTheDocument());
  });

  it('refuses to be used outside the provider', () => {
    const Broken = () => {
      useNotify();
      return null;
    };
    // React logs the thrown error; keep the test output clean.
    const spy = console.error;
    console.error = () => undefined;
    expect(() => render(<Broken />)).toThrow(/NotificationProvider/);
    console.error = spy;
  });
});

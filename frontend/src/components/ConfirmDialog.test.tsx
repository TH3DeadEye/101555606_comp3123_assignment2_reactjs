import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ConfirmDialog } from './ConfirmDialog';

const props = {
  open: true,
  title: 'Delete Jane Doe?',
  message: 'This cannot be undone.',
  confirmLabel: 'Delete',
  onConfirm: () => undefined,
  onCancel: () => undefined,
};

describe('ConfirmDialog', () => {
  it('is a labelled dialog with a title and a message', () => {
    render(<ConfirmDialog {...props} />);

    const dialog = screen.getByRole('dialog', { name: 'Delete Jane Doe?' });
    expect(dialog).toHaveAccessibleDescription('This cannot be undone.');
  });

  it('renders nothing while closed', () => {
    render(<ConfirmDialog {...props} open={false} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('puts the focus on the safe choice, Cancel', async () => {
    render(<ConfirmDialog {...props} />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus());
  });

  it('calls onConfirm and onCancel from the matching buttons', async () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(<ConfirmDialog {...props} onConfirm={onConfirm} onCancel={onCancel} />);

    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('cancels with the Escape key', async () => {
    const onCancel = vi.fn();
    render(<ConfirmDialog {...props} onCancel={onCancel} />);

    await userEvent.keyboard('{Escape}');

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('cannot be dismissed or repeated while the request is running', async () => {
    const onCancel = vi.fn();
    render(<ConfirmDialog {...props} busy onCancel={onCancel} />);

    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeDisabled();
    await userEvent.keyboard('{Escape}');
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('shows what went wrong inside the dialog', () => {
    render(<ConfirmDialog {...props} error="The server ran into a problem." />);
    expect(screen.getByRole('alert')).toHaveTextContent('The server ran into a problem.');
  });
});

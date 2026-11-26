import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { API_ORIGIN } from '../api/client';
import { PicturePicker } from './PicturePicker';

const png = (name = 'me.png') => new File(['abc'], name, { type: 'image/png' });

// Holds the file like the form does (without validation, which the form owns).
function Harness({ currentPicture, error, onPick }: { currentPicture?: string | null; error?: string | null; onPick?: (f: File | null) => void }) {
  const [file, setFile] = useState<File | null>(null);
  return (
    <PicturePicker
      file={file}
      currentPicture={currentPicture}
      personName="Jane Doe"
      error={error}
      onPick={(next) => {
        setFile(next);
        onPick?.(next);
      }}
    />
  );
}

// the browser's file filter can be bypassed, so tests must be able to pick any file
const setup = () => userEvent.setup({ applyAccept: false });

describe('PicturePicker', () => {
  it('starts with a placeholder and an invitation to choose a picture', () => {
    render(<Harness />);

    expect(screen.getByRole('group', { name: 'Profile picture (optional)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Choose picture' })).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText('JPEG, PNG or WebP, up to 2 MB.')).toBeInTheDocument();
  });

  it('only offers the allowed image types in the file chooser', () => {
    render(<Harness />);
    expect(screen.getByLabelText('Profile picture file')).toHaveAttribute('accept', 'image/jpeg,image/png,image/webp');
  });

  it('hands the chosen file to the form and shows a preview before anything is uploaded', async () => {
    const user = setup();
    const onPick = vi.fn();
    render(<Harness onPick={onPick} />);
    const file = png();

    await user.upload(screen.getByLabelText('Profile picture file'), file);

    expect(onPick).toHaveBeenCalledWith(file);
    const preview = await screen.findByRole('img', { name: 'Preview of the chosen picture' });
    expect(preview).toHaveAttribute('src', 'data:image/png;base64,YWJj');
    expect(screen.getByRole('button', { name: 'Change picture' })).toBeInTheDocument();
  });

  it('lets the user remove the chosen picture again', async () => {
    const user = setup();
    const onPick = vi.fn();
    render(<Harness onPick={onPick} />);
    await user.upload(screen.getByLabelText('Profile picture file'), png());
    await screen.findByRole('img', { name: 'Preview of the chosen picture' });

    await user.click(screen.getByRole('button', { name: 'Remove selected picture' }));

    expect(onPick).toHaveBeenLastCalledWith(null);
    await waitFor(() => expect(screen.queryByRole('img')).not.toBeInTheDocument());
  });

  it('shows the stored picture when editing, and the new preview replaces it', async () => {
    const user = setup();
    render(<Harness currentPicture="/uploads/old.png" />);

    expect(screen.getByRole('img', { name: 'Current picture of Jane Doe' })).toHaveAttribute('src', `${API_ORIGIN}/uploads/old.png`);
    expect(screen.getByRole('button', { name: 'Change picture' })).toBeInTheDocument();

    await user.upload(screen.getByLabelText('Profile picture file'), png());
    expect(await screen.findByRole('img', { name: 'Preview of the chosen picture' })).toBeInTheDocument();
  });

  it('shows an error message to assistive technology', () => {
    render(<Harness error="Only JPEG, PNG and WebP pictures are allowed." />);

    expect(screen.getByRole('alert')).toHaveTextContent('Only JPEG, PNG and WebP pictures are allowed.');
    expect(screen.getByLabelText('Profile picture file')).toHaveAccessibleDescription('Only JPEG, PNG and WebP pictures are allowed.');
    // regression: MUI 9 silently ignores a `color` prop on Typography, which once made this black
    expect(screen.getByRole('alert')).toHaveStyle({ color: 'rgb(211, 47, 47)' });
  });

  it('can pick the same file again after removing it', async () => {
    const user = setup();
    const onPick = vi.fn();
    render(<Harness onPick={onPick} />);
    const file = png();

    await user.upload(screen.getByLabelText('Profile picture file'), file);
    await user.upload(screen.getByLabelText('Profile picture file'), file);

    expect(onPick).toHaveBeenCalledTimes(2);
  });
});

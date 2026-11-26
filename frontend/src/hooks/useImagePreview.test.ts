import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useImagePreview } from './useImagePreview';

const png = (name: string, content = 'abc') => new File([content], name, { type: 'image/png' });

describe('useImagePreview', () => {
  it('is null when there is no file', () => {
    const { result } = renderHook(() => useImagePreview(null));
    expect(result.current).toBeNull();
  });

  it('turns a file into a data URL the <img> can show', async () => {
    const file = png('a.png'); // created once: a new File on every render would be a new input each time
    const { result } = renderHook(() => useImagePreview(file));

    await waitFor(() => expect(result.current).toBe('data:image/png;base64,YWJj'));
  });

  it('switches to the new file, and never shows the old one for it', async () => {
    const first = png('a.png', 'abc');
    const second = png('b.png', 'xyz');
    const { result, rerender } = renderHook(({ file }) => useImagePreview(file), { initialProps: { file: first as File | null } });
    await waitFor(() => expect(result.current).toBe('data:image/png;base64,YWJj'));

    rerender({ file: second });
    expect(result.current).not.toBe('data:image/png;base64,YWJj'); // not the old picture

    await waitFor(() => expect(result.current).toBe('data:image/png;base64,eHl6'));
  });

  it('goes back to null when the file is removed', async () => {
    const { result, rerender } = renderHook(({ file }) => useImagePreview(file), { initialProps: { file: png('a.png') as File | null } });
    await waitFor(() => expect(result.current).not.toBeNull());

    rerender({ file: null });

    expect(result.current).toBeNull();
  });
});

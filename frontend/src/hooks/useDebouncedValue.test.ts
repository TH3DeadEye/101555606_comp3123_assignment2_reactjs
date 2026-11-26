import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDebouncedValue } from './useDebouncedValue';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('useDebouncedValue', () => {
  it('starts with the initial value', () => {
    const { result } = renderHook(() => useDebouncedValue('a', 300));
    expect(result.current).toBe('a');
  });

  it('only follows the value after the delay', () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 300), { initialProps: { value: 'a' } });

    rerender({ value: 'b' });
    expect(result.current).toBe('a');

    act(() => {
      vi.advanceTimersByTime(299);
    });
    expect(result.current).toBe('a');

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe('b');
  });

  it('ignores the values in between while the user keeps typing', () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 300), { initialProps: { value: '' } });
    const seen: string[] = [];

    for (const typed of ['e', 'en', 'eng', 'engi']) {
      rerender({ value: typed });
      act(() => {
        vi.advanceTimersByTime(100); // always less than the delay
      });
      seen.push(result.current);
    }
    expect(seen).toEqual(['', '', '', '']); // nothing was applied yet

    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current).toBe('engi'); // only the final value, once
  });
});

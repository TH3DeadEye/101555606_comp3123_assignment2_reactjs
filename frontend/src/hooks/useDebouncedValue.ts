import { useEffect, useState } from 'react';

// Returns `value` only after it has stopped changing for `delayMs`. Used for
// search boxes, so a request is sent when the user pauses typing and not on
// every keystroke.
export function useDebouncedValue<T>(value: T, delayMs = 350): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer); // a new keystroke cancels the pending update
  }, [value, delayMs]);

  return debounced;
}

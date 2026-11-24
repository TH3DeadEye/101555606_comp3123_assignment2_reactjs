import { useEffect, type RefObject } from 'react';

// After a failed submit, moves keyboard focus to the first invalid field so
// screen-reader and keyboard users land on the problem. Increase `attempt`
// every time the form is submitted.
export function useFocusFirstInvalid(form: RefObject<HTMLFormElement | null>, attempt: number): void {
  useEffect(() => {
    if (attempt === 0) return;
    form.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [form, attempt]);
}

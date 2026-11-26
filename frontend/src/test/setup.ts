import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// jsdom does not implement scrolling.
window.scrollTo = () => undefined;

// Start every test from a clean page and an empty browser storage.
afterEach(() => {
  cleanup();
  localStorage.clear();
});

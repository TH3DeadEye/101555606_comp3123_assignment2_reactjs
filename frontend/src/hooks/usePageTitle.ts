import { useEffect } from 'react';

const APP_NAME = 'Employee Management App';

// Sets the browser tab title. Screen readers announce it when the page changes.
export function usePageTitle(title: string): void {
  useEffect(() => {
    document.title = `${title} | ${APP_NAME}`;
  }, [title]);
}

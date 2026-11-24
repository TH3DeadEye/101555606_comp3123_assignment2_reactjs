import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthProvider';
import { NotificationProvider } from '../context/NotificationProvider';
import { saveSession } from '../utils/session';
import { makeJwt, testUser } from './helpers';

interface Options {
  route?: string;
  authenticated?: boolean;
}

// Renders a screen inside the same providers the real app uses (router, query
// client, session, notifications). Tests start from a given URL, logged in or out.
export function renderWithProviders(ui: ReactElement, { route = '/', authenticated = false }: Options = {}) {
  if (authenticated) saveSession({ token: makeJwt(), user: testUser });

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const view = render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[route]}>
        <AuthProvider>
          <NotificationProvider>{ui}</NotificationProvider>
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return { queryClient, ...view };
}

import { QueryClient } from '@tanstack/react-query';
import { toAppError } from '../utils/errors';

// Retry once, and only for problems that can go away by themselves (the server
// restarting, a network blip). Answers like 401, 403, 404 and 429 are final:
// asking again would only waste requests and count against the rate limit.
export function shouldRetry(failureCount: number, error: unknown): boolean {
  const { kind } = toAppError(error);
  return (kind === 'network' || kind === 'timeout' || kind === 'server') && failureCount < 1;
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000, // data counts as fresh for 30 seconds
        refetchOnWindowFocus: false, // do not spend rate-limit budget on tab switches
        retry: shouldRetry,
      },
    },
  });
}

// The application's single query client.
export const queryClient = createQueryClient();

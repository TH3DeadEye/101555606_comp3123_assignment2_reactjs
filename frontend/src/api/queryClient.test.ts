import { AxiosError, AxiosHeaders, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { describe, expect, it } from 'vitest';
import { createQueryClient, shouldRetry } from './queryClient';

const config = { headers: new AxiosHeaders() } as InternalAxiosRequestConfig;
const status = (code: number) =>
  new AxiosError('failed', 'ERR_BAD_RESPONSE', config, {}, { status: code, data: {}, statusText: '', headers: {}, config } as AxiosResponse);

describe('shouldRetry', () => {
  it('retries a network failure, a timeout and a 5xx once', () => {
    expect(shouldRetry(0, new AxiosError('Network Error', 'ERR_NETWORK', config))).toBe(true);
    expect(shouldRetry(0, new AxiosError('timeout', 'ECONNABORTED', config))).toBe(true);
    expect(shouldRetry(0, status(503))).toBe(true);
  });

  it('does not retry a second time', () => {
    expect(shouldRetry(1, status(503))).toBe(false);
  });

  it('never retries answers that will not change', () => {
    for (const code of [400, 401, 403, 404, 409, 429]) {
      expect(shouldRetry(0, status(code))).toBe(false);
    }
  });

  it('does not retry unknown errors', () => {
    expect(shouldRetry(0, new Error('boom'))).toBe(false);
  });
});

describe('createQueryClient', () => {
  it('does not refetch just because the browser tab regained focus', () => {
    expect(createQueryClient().getDefaultOptions().queries?.refetchOnWindowFocus).toBe(false);
  });
});

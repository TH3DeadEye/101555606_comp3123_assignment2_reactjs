import { api } from './client';
import type { LoginPayload, LoginResponse, SignupPayload, SignupResponse } from './types';

// POST /api/v1/user/login -> 200 with a JWT
export async function login(payload: LoginPayload): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>('/user/login', payload);
  return data;
}

// POST /api/v1/user/signup -> 201
export async function signup(payload: SignupPayload): Promise<SignupResponse> {
  const { data } = await api.post<SignupResponse>('/user/signup', payload);
  return data;
}

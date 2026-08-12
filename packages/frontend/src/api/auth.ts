import { request } from './client';
import type { AuthLoginResponse } from '@shared/types';

export async function login(password: string) {
  const res = await request('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password })
  });
  return res.json() as Promise<AuthLoginResponse>;
}

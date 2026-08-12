import { signJson, verifyJsonToken } from './crypto';

export type AuthPayload = {
  sub: 'admin';
  scope: 'template:write';
  iat: number;
  exp: number;
};

export async function issueToken(secret: string, ttlSeconds = 8 * 60 * 60) {
  const now = Math.floor(Date.now() / 1000);
  const payload: AuthPayload = {
    sub: 'admin',
    scope: 'template:write',
    iat: now,
    exp: now + ttlSeconds,
  };
  return signJson(payload, secret);
}

export async function verifyToken(token: string, secret: string) {
  const payload = await verifyJsonToken(token, secret) as AuthPayload | null;
  if (!payload) return null;
  const now = Math.floor(Date.now() / 1000);
  if (payload.sub !== 'admin' || payload.scope !== 'template:write' || payload.exp < now) return null;
  return payload;
}

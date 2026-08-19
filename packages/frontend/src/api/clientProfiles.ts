import { getApiBase, getAuthToken, request } from './client';
import type { ClientProfilePayload, ClientProfileRecord, GenerationRunRecord, GenerationTestResult } from '@shared/types';

export async function fetchClientProfileList() {
  const res = await request('/api/client-profiles');
  return res.json() as Promise<ClientProfileRecord[]>;
}

export async function createClientProfile(payload: ClientProfilePayload) {
  const res = await request('/api/client-profiles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return res.json() as Promise<ClientProfileRecord>;
}

export async function updateClientProfile(id: string, payload: ClientProfilePayload) {
  const res = await request(`/api/client-profiles/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return res.json() as Promise<ClientProfileRecord>;
}

export async function setClientProfileEnabled(id: string, enabled: boolean) {
  const res = await request(`/api/client-profiles/${id}/enabled`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ enabled })
  });
  return res.json() as Promise<{ success: true; enabled: boolean }>;
}

export async function resetClientProfileToken(id: string) {
  const res = await request(`/api/client-profiles/${id}/token/reset`, { method: 'POST' });
  return res.json() as Promise<{ success: true; public_token: string }>;
}

export async function deleteClientProfile(id: string) {
  await request(`/api/client-profiles/${id}`, { method: 'DELETE' });
}

export async function testClientProfileGeneration(id: string) {
  const headers = new Headers();
  const token = getAuthToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(`${getApiBase()}/api/client-profiles/${id}/generate/test`, { method: 'POST', headers });
  const payload = await res.json().catch(() => ({
    success: false,
    error: `请求失败 (${res.status})`,
    summary: {},
    steps: []
  }));

  return payload as GenerationTestResult;
}

export async function fetchClientProfileGenerationRuns(id: string, limit = 10) {
  const res = await request(`/api/client-profiles/${id}/generation-runs?limit=${limit}`);
  return res.json() as Promise<GenerationRunRecord[]>;
}

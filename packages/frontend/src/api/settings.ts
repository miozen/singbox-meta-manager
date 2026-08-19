import { request } from './client';
import type { GenerationSettings, GenerationSettingsPayload } from '@shared/types';

export async function fetchGenerationSettings() {
  const res = await request('/api/settings/generation');
  return res.json() as Promise<GenerationSettings & { updated_at?: string | null }>;
}

export async function updateGenerationSettings(payload: GenerationSettingsPayload) {
  const res = await request('/api/settings/generation', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return res.json() as Promise<GenerationSettings & { updated_at?: string | null }>;
}

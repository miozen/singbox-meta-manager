import { request } from './client';
import type { TemplateListItem, TemplateRecord, TemplateVersionRecord } from '@shared/types';

export async function fetchTemplateList() {
  const res = await request('/api/templates');
  return res.json() as Promise<TemplateListItem[]>;
}

export async function fetchTemplate(id: string) {
  const res = await request(`/api/templates/${id}`);
  return res.json() as Promise<TemplateRecord>;
}

export async function createTemplate(payload: TemplateRecord) {
  await request('/api/templates', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

export async function updateTemplate(id: string, payload: Pick<TemplateRecord, 'name' | 'raw_config'>) {
  await request(`/api/templates/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

export async function deleteTemplate(id: string) {
  await request(`/api/templates/${id}`, { method: 'DELETE' });
}

export async function fetchTemplateVersions(id: string) {
  const res = await request(`/api/templates/${id}/versions`);
  return res.json() as Promise<TemplateVersionRecord[]>;
}

export async function restoreTemplateVersion(id: string, versionId: string) {
  const res = await request(`/api/templates/${id}/versions/${versionId}/restore`, {
    method: 'POST'
  });
  return res.json() as Promise<TemplateRecord>;
}

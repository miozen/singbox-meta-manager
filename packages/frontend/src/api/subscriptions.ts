import { request } from './client';
import type { SubscriptionPayload, SubscriptionRecord, SubscriptionTestReport } from '@shared/types';

export async function fetchSubscriptionList() {
  const res = await request('/api/subscriptions');
  return res.json() as Promise<SubscriptionRecord[]>;
}

export async function createSubscription(payload: SubscriptionPayload) {
  const res = await request('/api/subscriptions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return res.json() as Promise<{ id: string }>;
}

export async function updateSubscription(id: string, payload: SubscriptionPayload) {
  const res = await request(`/api/subscriptions/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return res.json() as Promise<SubscriptionRecord>;
}

export async function deleteSubscription(id: string) {
  await request(`/api/subscriptions/${id}`, { method: 'DELETE' });
}

export async function setSubscriptionEnabled(id: string, enabled: boolean) {
  const res = await request(`/api/subscriptions/${id}/enabled`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ enabled })
  });
  return res.json() as Promise<{ success: true; enabled: boolean }>;
}

export async function testSavedSubscription(id: string) {
  const res = await request(`/api/subscriptions/${id}/test`, { method: 'POST' });
  return res.json() as Promise<SubscriptionTestReport>;
}

export async function testDraftSubscription(subscription: Partial<SubscriptionPayload>) {
  const res = await request('/api/subscription/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subscription })
  });
  return res.json() as Promise<SubscriptionTestReport>;
}

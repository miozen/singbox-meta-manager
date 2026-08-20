import type { ClientProfilePayload } from '../../shared/src/types';
import { isValidJsonObjectString } from '../../shared/src/validators';
import {
  getClientProfileById,
  getClientProfileByToken,
  getClientProfileList,
  getClientProfileSubscriptions,
  getSubscriptionById,
  getTemplateById,
  type ClientProfileRow
} from './db';

async function ensureClientProfileTables(db: D1Database) {
  const existing = await db.prepare(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'client_profiles'"
  ).first<{ name: string }>();
  if (existing) return;

  await db.prepare(`
    CREATE TABLE IF NOT EXISTS client_profiles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      template_id TEXT NOT NULL,
      public_token TEXT NOT NULL UNIQUE,
      enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE RESTRICT
    )
  `).run();
  await db.prepare(`
    CREATE INDEX IF NOT EXISTS idx_client_profiles_template_id
    ON client_profiles(template_id)
  `).run();
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS client_profile_subscriptions (
      client_profile_id TEXT NOT NULL,
      subscription_id TEXT NOT NULL,
      position INTEGER NOT NULL DEFAULT 0,
      override_json TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (client_profile_id, subscription_id),
      FOREIGN KEY (client_profile_id) REFERENCES client_profiles(id) ON DELETE CASCADE,
      FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE CASCADE
    )
  `).run();
  await db.prepare(`
    CREATE INDEX IF NOT EXISTS idx_client_profile_subscriptions_profile_position
    ON client_profile_subscriptions(client_profile_id, position)
  `).run();
}

function newPublicToken() {
  return `${crypto.randomUUID().replace(/-/g, '')}${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;
}

function normalizeBindings(payload: ClientProfilePayload) {
  const seen = new Set<string>();
  return (Array.isArray(payload.subscriptions) ? payload.subscriptions : [])
    .filter((item) => item && typeof item.subscription_id === 'string' && item.subscription_id)
    .filter((item) => {
      if (seen.has(item.subscription_id)) return false;
      seen.add(item.subscription_id);
      return true;
    })
    .map((item, index) => ({
      subscription_id: item.subscription_id,
      position: Number.isInteger(item.position) ? item.position : index,
      override_json: item.override_json?.trim() || null
    }))
    .sort((a, b) => a.position - b.position)
    .map((item, index) => ({ ...item, position: index }));
}

export function validateClientProfilePayload(payload: ClientProfilePayload) {
  if (!payload || typeof payload !== 'object') return 'Missing request body';
  if (!payload.name?.trim() || payload.name.trim().length > 80) return 'Client profile name must be 1-80 characters';
  if (!payload.template_id?.trim()) return 'Template is required';
  if (payload.enabled !== undefined && typeof payload.enabled !== 'boolean') return 'Enabled must be boolean';
  for (const binding of normalizeBindings(payload)) {
    if (!isValidJsonObjectString(binding.override_json)) return 'Subscription override must be a JSON object';
  }
  return '';
}

async function exposeProfile(db: D1Database, row: ClientProfileRow) {
  const bindings = await getClientProfileSubscriptions(db, row.id);
  return {
    id: row.id,
    name: row.name,
    template_id: row.template_id,
    template_name: row.template_name,
    public_token: row.public_token,
    enabled: Boolean(row.enabled),
    created_at: row.created_at,
    updated_at: row.updated_at,
    subscriptions: bindings.results.map((binding) => ({
      subscription_id: binding.subscription_id,
      subscription_name: binding.subscription_name,
      enabled: Boolean(binding.subscription_enabled),
      position: binding.position,
      override_json: binding.override_json || null
    }))
  };
}

async function validateBindingTargets(db: D1Database, payload: ClientProfilePayload) {
  const bindings = normalizeBindings(payload);
  for (const binding of bindings) {
    const subscription = await getSubscriptionById(db, binding.subscription_id);
    if (!subscription) throw new Error('subscription_not_found');
  }
  return bindings;
}

async function saveBindings(db: D1Database, profileId: string, payload: ClientProfilePayload) {
  const bindings = await validateBindingTargets(db, payload);
  await db.prepare('DELETE FROM client_profile_subscriptions WHERE client_profile_id = ?').bind(profileId).run();
  for (const binding of bindings) {
    await db.prepare(`
      INSERT INTO client_profile_subscriptions (client_profile_id, subscription_id, position, override_json)
      VALUES (?, ?, ?, ?)
    `).bind(profileId, binding.subscription_id, binding.position, binding.override_json).run();
  }
}

export async function listClientProfiles(db: D1Database) {
  await ensureClientProfileTables(db);
  const rows = await getClientProfileList(db);
  return Promise.all(rows.results.map((row) => exposeProfile(db, row)));
}

export async function readClientProfile(db: D1Database, id: string) {
  await ensureClientProfileTables(db);
  const row = await getClientProfileById(db, id);
  return row ? exposeProfile(db, row) : null;
}

export async function createClientProfile(db: D1Database, payload: ClientProfilePayload) {
  await ensureClientProfileTables(db);
  const template = await getTemplateById(db, payload.template_id);
  if (!template) throw new Error('template_not_found');
  await validateBindingTargets(db, payload);
  const id = crypto.randomUUID();
  const publicToken = newPublicToken();
  await db.prepare(`
    INSERT INTO client_profiles (id, name, template_id, public_token, enabled)
    VALUES (?, ?, ?, ?, ?)
  `).bind(id, payload.name.trim(), payload.template_id, publicToken, payload.enabled === false ? 0 : 1).run();
  await saveBindings(db, id, payload);
  return readClientProfile(db, id);
}

export async function updateClientProfile(db: D1Database, id: string, payload: ClientProfilePayload) {
  await ensureClientProfileTables(db);
  const current = await getClientProfileById(db, id);
  if (!current) return null;
  const template = await getTemplateById(db, payload.template_id);
  if (!template) throw new Error('template_not_found');
  await db.prepare(`
    UPDATE client_profiles
    SET name = ?, template_id = ?, enabled = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(payload.name.trim(), payload.template_id, payload.enabled === false ? 0 : 1, id).run();
  await saveBindings(db, id, payload);
  return readClientProfile(db, id);
}

export async function setClientProfileEnabled(db: D1Database, id: string, enabled: boolean) {
  await ensureClientProfileTables(db);
  const result = await db.prepare('UPDATE client_profiles SET enabled = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .bind(enabled ? 1 : 0, id).run();
  return result.meta.changes ? { success: true, enabled } : null;
}

export async function resetClientProfileToken(db: D1Database, id: string) {
  await ensureClientProfileTables(db);
  const token = newPublicToken();
  const result = await db.prepare('UPDATE client_profiles SET public_token = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .bind(token, id).run();
  if (!result.meta.changes) return null;
  return { success: true, public_token: token };
}

export async function deleteClientProfile(db: D1Database, id: string) {
  await ensureClientProfileTables(db);
  await db.prepare('DELETE FROM client_profile_subscriptions WHERE client_profile_id = ?').bind(id).run();
  return db.prepare('DELETE FROM client_profiles WHERE id = ?').bind(id).run();
}

export async function readClientProfileByToken(db: D1Database, token: string) {
  await ensureClientProfileTables(db);
  const row = await getClientProfileByToken(db, token);
  return row ? exposeProfile(db, row) : null;
}
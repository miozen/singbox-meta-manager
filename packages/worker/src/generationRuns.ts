import type { GenerationStep } from '../../shared/src/types';

type RunStatus = 'success' | 'error' | 'fallback';
type TriggerType = 'manual' | 'public';

export type GenerationRunRecord = {
  id: string;
  client_profile_id: string;
  status: RunStatus;
  trigger_type: TriggerType;
  duration_ms: number;
  summary: Record<string, unknown>;
  steps: GenerationStep[];
  error?: string | null;
  used_cache: boolean;
  created_at?: string;
};

type GenerationRunRow = {
  id: string;
  client_profile_id: string;
  status: RunStatus;
  trigger_type: TriggerType;
  duration_ms: number;
  summary_json: string;
  steps_json: string;
  error?: string | null;
  used_cache: number;
  created_at?: string;
};

type ConfigCacheRow = {
  client_profile_id: string;
  config_json: string;
  summary_json: string;
  updated_at?: string;
};

export async function ensureGenerationRunTables(db: D1Database) {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS generation_runs (
      id TEXT PRIMARY KEY,
      client_profile_id TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('success', 'error', 'fallback')),
      trigger_type TEXT NOT NULL DEFAULT 'manual' CHECK (trigger_type IN ('manual', 'public')),
      duration_ms INTEGER NOT NULL DEFAULT 0,
      summary_json TEXT NOT NULL DEFAULT '{}',
      steps_json TEXT NOT NULL DEFAULT '[]',
      error TEXT,
      used_cache INTEGER NOT NULL DEFAULT 0 CHECK (used_cache IN (0, 1)),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (client_profile_id) REFERENCES client_profiles(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_generation_runs_profile_created_at
      ON generation_runs(client_profile_id, created_at DESC);
    CREATE TABLE IF NOT EXISTS client_profile_config_cache (
      client_profile_id TEXT PRIMARY KEY,
      config_json TEXT NOT NULL,
      summary_json TEXT NOT NULL DEFAULT '{}',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (client_profile_id) REFERENCES client_profiles(id) ON DELETE CASCADE
    );
  `);
}

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function exposeRun(row: GenerationRunRow): GenerationRunRecord {
  return {
    id: row.id,
    client_profile_id: row.client_profile_id,
    status: row.status,
    trigger_type: row.trigger_type,
    duration_ms: row.duration_ms,
    summary: parseJson(row.summary_json, {}),
    steps: parseJson(row.steps_json, []),
    error: row.error || null,
    used_cache: Boolean(row.used_cache),
    created_at: row.created_at
  };
}

export async function listGenerationRuns(db: D1Database, clientProfileId: string, limit = 10) {
  await ensureGenerationRunTables(db);
  const safeLimit = Math.max(1, Math.min(50, Math.trunc(limit)));
  const rows = await db.prepare(`
    SELECT id, client_profile_id, status, trigger_type, duration_ms, summary_json, steps_json, error, used_cache, created_at
    FROM generation_runs
    WHERE client_profile_id = ?
    ORDER BY created_at DESC, id DESC
    LIMIT ?
  `).bind(clientProfileId, safeLimit).all<GenerationRunRow>();
  return rows.results.map(exposeRun);
}

export async function saveGenerationRun(db: D1Database, input: {
  client_profile_id: string;
  status: RunStatus;
  trigger_type: TriggerType;
  duration_ms: number;
  summary: Record<string, unknown>;
  steps: GenerationStep[];
  error?: string | null;
  used_cache?: boolean;
}) {
  await ensureGenerationRunTables(db);
  const id = crypto.randomUUID();
  await db.prepare(`
    INSERT INTO generation_runs (id, client_profile_id, status, trigger_type, duration_ms, summary_json, steps_json, error, used_cache)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    input.client_profile_id,
    input.status,
    input.trigger_type,
    input.duration_ms,
    JSON.stringify(input.summary || {}),
    JSON.stringify(input.steps || []),
    input.error || null,
    input.used_cache ? 1 : 0
  ).run();
  await db.prepare(`
    DELETE FROM generation_runs
    WHERE client_profile_id = ?
      AND id NOT IN (
        SELECT id
        FROM generation_runs
        WHERE client_profile_id = ?
        ORDER BY created_at DESC, id DESC
        LIMIT 50
      )
  `).bind(input.client_profile_id, input.client_profile_id).run();
  return id;
}

export async function saveConfigCache(db: D1Database, clientProfileId: string, config: Record<string, unknown>, summary: Record<string, unknown>) {
  await ensureGenerationRunTables(db);
  await db.prepare(`
    INSERT INTO client_profile_config_cache (client_profile_id, config_json, summary_json, updated_at)
    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(client_profile_id) DO UPDATE SET
      config_json = excluded.config_json,
      summary_json = excluded.summary_json,
      updated_at = CURRENT_TIMESTAMP
  `).bind(clientProfileId, JSON.stringify(config), JSON.stringify(summary || {})).run();
}

export async function readConfigCache(db: D1Database, clientProfileId: string) {
  await ensureGenerationRunTables(db);
  const row = await db.prepare(`
    SELECT client_profile_id, config_json, summary_json, updated_at
    FROM client_profile_config_cache
    WHERE client_profile_id = ?
  `).bind(clientProfileId).first<ConfigCacheRow>();
  if (!row) return null;
  return {
    client_profile_id: row.client_profile_id,
    config: parseJson<Record<string, unknown>>(row.config_json, {}),
    summary: parseJson<Record<string, unknown>>(row.summary_json, {}),
    updated_at: row.updated_at
  };
}

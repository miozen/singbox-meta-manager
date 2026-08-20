import { getTemplateById, getTemplateList, getTemplateVersionById, getTemplateVersions } from './db';

const schemaUrl = 'https://sing-box.sagernet.org/schema.json';

async function ensureVersionTable(db: D1Database) {
  const existing = await db.prepare(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'template_versions'"
  ).first<{ name: string }>();
  if (existing) return;

  await db.prepare(`
    CREATE TABLE IF NOT EXISTS template_versions (
      id TEXT PRIMARY KEY,
      template_id TEXT NOT NULL,
      template_name TEXT NOT NULL,
      raw_config TEXT NOT NULL,
      version_note TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE
    )
  `).run();
  await db.prepare(`
    CREATE INDEX IF NOT EXISTS idx_template_versions_template_id_created_at
    ON template_versions(template_id, created_at DESC)
  `).run();
}

async function insertTemplateVersion(
  db: D1Database,
  templateId: string,
  templateName: string,
  rawConfig: string,
  versionNote?: string
) {
  await ensureVersionTable(db);
  return db.prepare(`
    INSERT INTO template_versions (id, template_id, template_name, raw_config, version_note)
    VALUES (?, ?, ?, ?, ?)
  `).bind(crypto.randomUUID(), templateId, templateName, rawConfig, versionNote || null).run();
}

async function seedVersionIfMissing(db: D1Database, templateId: string) {
  await ensureVersionTable(db);
  const existing = await getTemplateVersions(db, templateId);
  if (existing.results.length) return existing.results;

  const template = await getTemplateById(db, templateId);
  if (!template) return [];

  await insertTemplateVersion(db, template.id, template.name, template.raw_config, '初始版本');
  const seeded = await getTemplateVersions(db, templateId);
  return seeded.results;
}

export async function listTemplates(db: D1Database) {
  const { results } = await getTemplateList(db);
  return results;
}

export async function readTemplate(db: D1Database, id: string) {
  return getTemplateById(db, id);
}

export async function createTemplate(db: D1Database, id: string, name: string, rawConfig: string) {
  const result = await db.prepare('INSERT INTO templates (id, name, raw_config) VALUES (?, ?, ?)').bind(id, name, rawConfig).run();
  await insertTemplateVersion(db, id, name, rawConfig, '初始版本');
  return result;
}

export async function updateTemplate(db: D1Database, id: string, name: string, rawConfig: string, versionNote = '手动保存') {
  const result = await db.prepare('UPDATE templates SET name = ?, raw_config = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(name, rawConfig, id).run();
  if (result.meta.changes) {
    await insertTemplateVersion(db, id, name, rawConfig, versionNote);
  }
  return result;
}

export async function deleteTemplate(db: D1Database, id: string) {
  await ensureVersionTable(db);
  await db.prepare('DELETE FROM template_versions WHERE template_id = ?').bind(id).run();
  return db.prepare('DELETE FROM templates WHERE id = ?').bind(id).run();
}

export async function listTemplateVersions(db: D1Database, templateId: string) {
  return seedVersionIfMissing(db, templateId);
}

export async function restoreTemplateVersion(db: D1Database, templateId: string, versionId: string) {
  await ensureVersionTable(db);
  const version = await getTemplateVersionById(db, templateId, versionId);
  if (!version) return null;

  const result = await updateTemplate(
    db,
    templateId,
    version.template_name,
    version.raw_config,
    `回滚到版本 ${version.id}`
  );

  if (!result.meta.changes) return null;
  return getTemplateById(db, templateId);
}

export function ensureSchema(rawConfig: string) {
  if (rawConfig.includes('"$schema"')) return rawConfig;
  try {
    const obj = JSON.parse(rawConfig);
    obj['$schema'] = schemaUrl;
    return JSON.stringify(obj, null, 2);
  } catch {
    return rawConfig;
  }
}

export function stripSchema(rawConfig: string) {
  try {
    const obj = JSON.parse(rawConfig);
    if (obj['$schema']) delete obj['$schema'];
    return JSON.stringify(obj, null, 2);
  } catch {
    return rawConfig;
  }
}

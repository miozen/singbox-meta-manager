import { getTemplateById, getTemplateList } from './db';

const schemaUrl = 'https://sing-box.sagernet.org/schema.json';

export async function listTemplates(db: D1Database) {
  const { results } = await getTemplateList(db);
  return results;
}

export async function readTemplate(db: D1Database, id: string) {
  return getTemplateById(db, id);
}

export async function createTemplate(db: D1Database, id: string, name: string, rawConfig: string) {
  return db.prepare('INSERT INTO templates (id, name, raw_config) VALUES (?, ?, ?)').bind(id, name, rawConfig).run();
}

export async function updateTemplate(db: D1Database, id: string, name: string, rawConfig: string) {
  return db.prepare('UPDATE templates SET name = ?, raw_config = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(name, rawConfig, id).run();
}

export async function deleteTemplate(db: D1Database, id: string) {
  return db.prepare('DELETE FROM templates WHERE id = ?').bind(id).run();
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

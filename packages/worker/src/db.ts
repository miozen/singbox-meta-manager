export type TemplateRow = {
  id: string;
  name: string;
  raw_config: string;
  created_at?: string;
  updated_at?: string;
};

export function getTemplateList(db: D1Database) {
  return db.prepare('SELECT id, name, updated_at FROM templates ORDER BY updated_at DESC').all();
}

export function getTemplateById(db: D1Database, id: string) {
  return db.prepare('SELECT * FROM templates WHERE id = ?').bind(id).first<TemplateRow>();
}

export const TEMPLATE_ID_RE = /^[a-zA-Z0-9_-]+$/;

export function isValidTemplateId(id: unknown): id is string {
  return typeof id === 'string' && TEMPLATE_ID_RE.test(id);
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function ensureJsonString(raw: string) {
  JSON.parse(raw);
  return raw;
}

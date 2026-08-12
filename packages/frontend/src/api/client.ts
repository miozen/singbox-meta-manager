const API_BASE = import.meta.env.VITE_API_BASE || '';

export function getApiBase() {
  return API_BASE;
}

export async function request(path: string, init: RequestInit = {}) {
  const res = await fetch(`${API_BASE}${path}`, init);
  if (!res.ok) throw new Error(await res.text());
  return res;
}

const encoder = new TextEncoder();

function toBase64Url(bytes: Uint8Array) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(input: string) {
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((input.length + 3) % 4);
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export async function signJson(payload: unknown, secret: string) {
  const body = JSON.stringify(payload);
  const bodyBytes = encoder.encode(body);
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, bodyBytes);
  return `${toBase64Url(bodyBytes)}.${toBase64Url(new Uint8Array(sig))}`;
}

export async function verifyJsonToken(token: string, secret: string) {
  const [payloadPart, sigPart] = token.split('.');
  if (!payloadPart || !sigPart) return null;
  const payloadBytes = fromBase64Url(payloadPart);
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
  const ok = await crypto.subtle.verify('HMAC', key, fromBase64Url(sigPart), payloadBytes);
  if (!ok) return null;
  try {
    return JSON.parse(new TextDecoder().decode(payloadBytes));
  } catch {
    return null;
  }
}

// Session cookie helpers. Web Crypto only, so this runs in both Edge Middleware and Node functions.

export const COOKIE_NAME = 'plan_session';
export const SESSION_MAX_AGE = 90 * 24 * 60 * 60; // seconds

const enc = new TextEncoder();

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
}

async function hmac(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return toHex(await crypto.subtle.sign('HMAC', key, enc.encode(message)));
}

/** Constant-time string compare: hashes both sides so length differences don't leak either. */
export async function safeEqual(a: string, b: string): Promise<boolean> {
  const [ha, hb] = await Promise.all([
    crypto.subtle.digest('SHA-256', enc.encode(a)),
    crypto.subtle.digest('SHA-256', enc.encode(b)),
  ]);
  const x = new Uint8Array(ha);
  const y = new Uint8Array(hb);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

/** Cookie value: `<hmac-sha256 hex>.<issuedAt ms>` */
export async function createSession(secret: string, issuedAt = Date.now()): Promise<string> {
  return `${await hmac(secret, String(issuedAt))}.${issuedAt}`;
}

export async function verifySession(secret: string | undefined, value: string | undefined | null): Promise<boolean> {
  if (!secret || !value) return false;
  const m = /^([0-9a-f]{64})\.(\d{10,16})$/.exec(value);
  if (!m) return false;
  const issuedAt = Number(m[2]);
  const now = Date.now();
  if (issuedAt > now + 60_000 || now - issuedAt > SESSION_MAX_AGE * 1000) return false;
  return safeEqual(m[1], await hmac(secret, m[2]));
}

export function readCookie(header: string | null | undefined, name = COOKIE_NAME): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i > -1 && part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return undefined;
}

export function sessionCookie(value: string): string {
  return `${COOKIE_NAME}=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_MAX_AGE}`;
}

export function clearedCookie(): string {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { body, HttpError, route } from './_lib/http.js';
import { createSession, safeEqual, sessionCookie } from './_lib/session.js';

// In-memory rate limit: 10 attempts per IP per 15 minutes (per function instance).
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;
const attempts = new Map<string, { count: number; reset: number }>();

function clientIp(req: VercelRequest): string {
  const fwd = req.headers['x-forwarded-for'];
  const first = (Array.isArray(fwd) ? fwd[0] : fwd)?.split(',')[0]?.trim();
  return first || (req.headers['x-real-ip'] as string | undefined) || req.socket?.remoteAddress || 'unknown';
}

function limited(ip: string): boolean {
  const now = Date.now();
  if (attempts.size > 5000) for (const [k, v] of attempts) if (v.reset < now) attempts.delete(k);
  const a = attempts.get(ip);
  if (!a || a.reset < now) {
    attempts.set(ip, { count: 1, reset: now + WINDOW_MS });
    return false;
  }
  a.count++;
  return a.count > MAX_ATTEMPTS;
}

export default route(
  {
    POST: async (req: VercelRequest, res: VercelResponse) => {
      const password = process.env.PLAN_PASSWORD;
      const secret = process.env.PLAN_SECRET;
      if (!password || !secret) throw new Error('PLAN_PASSWORD / PLAN_SECRET not set');

      const ip = clientIp(req);
      if (limited(ip)) {
        res.setHeader('Retry-After', String(Math.ceil((attempts.get(ip)!.reset - Date.now()) / 1000)));
        throw new HttpError(429, 'Too many attempts. Try again in a few minutes.');
      }

      const given = body(req).password;
      if (typeof given !== 'string' || given.length > 512 || !(await safeEqual(given, password))) {
        throw new HttpError(401, 'Wrong password');
      }

      attempts.delete(ip);
      res.setHeader('Set-Cookie', sessionCookie(await createSession(secret)));
      return { ok: true };
    },
  },
  { auth: false },
);

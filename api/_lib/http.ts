import type { VercelRequest, VercelResponse } from '@vercel/node';
import { readCookie, verifySession } from './session.js';

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export const bad = (msg: string) => new HttpError(400, msg);
export const notFound = (what = 'Not found') => new HttpError(404, what);

type Handler = (req: VercelRequest, res: VercelResponse) => Promise<unknown>;

/**
 * Wraps a handler: re-checks the session (middleware already does, this is defence in depth),
 * routes by method, and turns errors into JSON.
 */
export function route(handlers: Partial<Record<'GET' | 'POST' | 'PATCH' | 'DELETE', Handler>>, opts: { auth?: boolean } = {}) {
  return async (req: VercelRequest, res: VercelResponse) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    try {
      if (opts.auth !== false && !(await verifySession(process.env.PLAN_SECRET, readCookie(req.headers.cookie)))) {
        throw new HttpError(401, 'Unauthorized');
      }
      const h = handlers[req.method as keyof typeof handlers];
      if (!h) {
        res.setHeader('Allow', Object.keys(handlers).join(', '));
        throw new HttpError(405, 'Method not allowed');
      }
      const out = await h(req, res);
      if (!res.headersSent) res.status(200).json(out ?? { ok: true });
    } catch (e) {
      if (e instanceof HttpError) {
        res.status(e.status).json({ error: e.message });
      } else {
        console.error(e);
        res.status(500).json({ error: 'Server error' });
      }
    }
  };
}

/** Throws a 500 for Supabase errors, 404 for missing single rows. */
type DbResult = { data: unknown; error: { message: string; code?: string } | null };

export function check<R extends DbResult>(r: R, what = 'Not found'): NonNullable<R['data']> {
  if (r.error) {
    if (r.error.code === 'PGRST116') throw notFound(what);
    if (r.error.code === '22P02') throw bad('Invalid id');
    throw new Error(r.error.message);
  }
  if (r.data == null) throw notFound(what);
  return r.data as NonNullable<R['data']>;
}

export function idParam(req: VercelRequest): string {
  const id = req.query.id;
  if (typeof id !== 'string' || !/^[0-9a-f-]{36}$/i.test(id)) throw bad('Invalid id');
  return id;
}

export function body(req: VercelRequest): Record<string, unknown> {
  const b = typeof req.body === 'string' ? safeParse(req.body) : req.body;
  if (!b || typeof b !== 'object' || Array.isArray(b)) throw bad('Expected a JSON object');
  return b as Record<string, unknown>;
}

function safeParse(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    throw bad('Invalid JSON');
  }
}

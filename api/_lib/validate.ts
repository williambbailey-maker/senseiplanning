import { bad } from './http.js';

export const STATUSES = ['not_started', 'in_progress', 'done', 'at_risk'] as const;
export type Status = (typeof STATUSES)[number];

export const LIMITS = {
  projectName: 120,
  summary: 2000,
  track: 40,
  tracks: 30,
  title: 300,
  owner: 60,
  notes: 10000,
  logBody: 10000,
};

type Obj = Record<string, unknown>;

export function str(o: Obj, key: string, max: number, opts: { required?: boolean; allowEmpty?: boolean } = {}): string | undefined {
  const v = o[key];
  if (v === undefined) {
    if (opts.required) throw bad(`${key} is required`);
    return undefined;
  }
  if (typeof v !== 'string') throw bad(`${key} must be a string`);
  const s = opts.allowEmpty ? v : v.trim();
  if (!opts.allowEmpty && !s) throw bad(`${key} can't be empty`);
  if (s.length > max) throw bad(`${key} is too long (max ${max})`);
  return s;
}

/** `YYYY-MM-DD`, empty string or null → null. undefined → undefined (not provided). */
export function date(o: Obj, key: string): string | null | undefined {
  const v = o[key];
  if (v === undefined) return undefined;
  if (v === null || v === '') return null;
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v) || !isRealDate(v)) {
    throw bad(`${key} must be a date (YYYY-MM-DD)`);
  }
  return v;
}

function isRealDate(v: string): boolean {
  const d = new Date(v + 'T00:00:00Z');
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}

export function bool(o: Obj, key: string): boolean | undefined {
  const v = o[key];
  if (v === undefined) return undefined;
  if (typeof v !== 'boolean') throw bad(`${key} must be true or false`);
  return v;
}

export function int(o: Obj, key: string): number | undefined {
  const v = o[key];
  if (v === undefined) return undefined;
  if (typeof v !== 'number' || !Number.isInteger(v) || Math.abs(v) > 1_000_000) throw bad(`${key} must be an integer`);
  return v;
}

export function status(o: Obj, key = 'status'): Status | undefined {
  const v = o[key];
  if (v === undefined) return undefined;
  if (!STATUSES.includes(v as Status)) throw bad(`${key} must be one of ${STATUSES.join(', ')}`);
  return v as Status;
}

export function uuid(o: Obj, key: string): string | null | undefined {
  const v = o[key];
  if (v === undefined) return undefined;
  if (v === null) return null;
  if (typeof v !== 'string' || !/^[0-9a-f-]{36}$/i.test(v)) throw bad(`${key} must be an id`);
  return v;
}

export function tracks(o: Obj, key = 'tracks'): string[] | undefined {
  const v = o[key];
  if (v === undefined) return undefined;
  if (!Array.isArray(v)) throw bad(`${key} must be a list`);
  if (v.length > LIMITS.tracks) throw bad(`Too many tracks (max ${LIMITS.tracks})`);
  const out: string[] = [];
  for (const t of v) {
    if (typeof t !== 'string' || !t.trim()) throw bad('Track names must be non-empty text');
    const s = t.trim();
    if (s.length > LIMITS.track) throw bad(`Track name too long (max ${LIMITS.track})`);
    if (out.some((x) => x.toLowerCase() === s.toLowerCase())) throw bad(`Duplicate track "${s}"`);
    out.push(s);
  }
  return out;
}

/** Drops undefined keys so PATCHes only touch what was sent. */
export function defined<T extends Obj>(o: T): Partial<T> {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as Partial<T>;
}

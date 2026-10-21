import { db } from '../_lib/db.js';
import { bad, body, check, HttpError, idParam, route } from '../_lib/http.js';
import { getProject } from '../_lib/projects.js';
import { bool, date, defined, LIMITS, str, tracks } from '../_lib/validate.js';

export default route({
  GET: async (req) => {
    const id = idParam(req);
    const project = await getProject(id);
    const [items, log] = await Promise.all([
      db().from('items').select('*').eq('project_id', id).order('sort_order').order('created_at'),
      db().from('log').select('*').eq('project_id', id).order('created_at', { ascending: false }),
    ]);
    return { project, items: check(items), log: check(log) };
  },

  // Rename, retarget, archive, or edit tracks. `renames: [{from, to}]` carries track renames onto items.
  PATCH: async (req) => {
    const id = idParam(req);
    const b = body(req);
    const current = await getProject(id);
    const patch = defined({
      name: str(b, 'name', LIMITS.projectName),
      target_date: date(b, 'target_date'),
      summary: str(b, 'summary', LIMITS.summary, { allowEmpty: true }),
      archived: bool(b, 'archived'),
      tracks: tracks(b),
    });

    const renames = parseRenames(b.renames, current.tracks as string[]);
    if (patch.tracks) {
      if (!patch.tracks.length) throw bad('A project needs at least one track');
      const used = check(await db().from('items').select('track').eq('project_id', id)) as { track: string }[];
      const map = new Map(renames.map((r) => [r.from, r.to]));
      const orphaned = [...new Set(used.map((u) => map.get(u.track) ?? u.track))].filter((t) => !patch.tracks!.includes(t));
      if (orphaned.length) throw new HttpError(409, `Move or delete the items in ${orphaned.map((t) => `"${t}"`).join(', ')} first`);
      for (const r of renames) {
        check(await db().from('items').update({ track: r.to }).eq('project_id', id).eq('track', r.from).select('id'));
      }
    } else if (renames.length) {
      throw bad('renames needs tracks');
    }

    if (!Object.keys(patch).length) return current;
    return check(await db().from('projects').update(patch).eq('id', id).select().single());
  },

  DELETE: async (req) => {
    const id = idParam(req);
    check(await db().from('projects').delete().eq('id', id).select('id').single(), 'Project not found');
    return { ok: true };
  },
});

function parseRenames(v: unknown, existing: string[]): { from: string; to: string }[] {
  if (v === undefined) return [];
  if (!Array.isArray(v) || v.length > LIMITS.tracks) throw bad('renames must be a list');
  return v.map((r) => {
    const from = r?.from;
    const to = typeof r?.to === 'string' ? r.to.trim() : r?.to;
    if (typeof from !== 'string' || !existing.includes(from)) throw bad('Unknown track in renames');
    if (typeof to !== 'string' || !to || to.length > LIMITS.track) throw bad('Invalid new track name');
    return { from, to };
  });
}

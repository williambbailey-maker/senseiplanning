import { db } from '../_lib/db.js';
import { bad, body, check, route } from '../_lib/http.js';
import { getProject } from '../_lib/projects.js';
import { date, LIMITS, str, tracks, uuid } from '../_lib/validate.js';

type ItemLite = { id: string; project_id: string; title: string; track: string; status: string; due: string | null };

export default route({
  // Project list with counts and the next due open item.
  GET: async () => {
    const projects = check(await db().from('projects').select('*').order('archived').order('target_date', { nullsFirst: false }).order('created_at'));
    const items = check(
      await db().from('items').select('id, project_id, title, track, status, due').order('due', { nullsFirst: false }),
    ) as ItemLite[];
    return projects.map((p) => {
      const mine = items.filter((i) => i.project_id === p.id);
      const counts = { done: 0, in_progress: 0, not_started: 0, at_risk: 0 } as Record<string, number>;
      for (const i of mine) counts[i.status] = (counts[i.status] ?? 0) + 1;
      const next = mine.find((i) => i.status !== 'done' && i.due) ?? null;
      return {
        ...p,
        counts,
        total: mine.length,
        open: mine.length - counts.done,
        done: counts.done,
        next_item: next && { id: next.id, title: next.title, due: next.due, track: next.track, status: next.status },
      };
    });
  },

  // Create a project, optionally duplicating the structure (tracks + item titles) of another.
  POST: async (req) => {
    const b = body(req);
    const name = str(b, 'name', LIMITS.projectName, { required: true })!;
    const target_date = date(b, 'target_date') ?? null;
    const summary = str(b, 'summary', LIMITS.summary, { allowEmpty: true }) ?? '';
    const from = uuid(b, 'duplicate_from');

    let trackList = tracks(b) ?? [];
    let template: { track: string; title: string; owner: string; sort_order: number | null }[] = [];
    if (from) {
      const src = await getProject(from);
      trackList = src.tracks as string[];
      template = check(await db().from('items').select('track, title, owner, sort_order').eq('project_id', from).order('sort_order'));
    }
    if (!trackList.length) throw bad('Add at least one track');

    const project = check(await db().from('projects').insert({ name, target_date, summary, tracks: trackList }).select().single());
    if (template.length) {
      const rows = template.map((t) => ({ ...t, project_id: project.id, status: 'not_started' as const, due: null, notes: '' }));
      const r = await db().from('items').insert(rows);
      if (r.error) {
        await db().from('projects').delete().eq('id', project.id);
        throw new Error(r.error.message);
      }
    }
    return project;
  },
});

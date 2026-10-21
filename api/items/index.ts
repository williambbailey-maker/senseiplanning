import { db } from '../_lib/db.js';
import { bad, body, check, route } from '../_lib/http.js';
import { assertTrack } from '../_lib/projects.js';
import { date, LIMITS, status, str, uuid } from '../_lib/validate.js';

export default route({
  POST: async (req) => {
    const b = body(req);
    const project_id = uuid(b, 'project_id');
    if (!project_id) throw bad('project_id is required');
    const track = str(b, 'track', LIMITS.track, { required: true })!;
    await assertTrack(project_id, track);

    const last = check(
      await db().from('items').select('sort_order').eq('project_id', project_id).eq('track', track).order('sort_order', { ascending: false }).limit(1),
    ) as { sort_order: number | null }[];

    const row = {
      project_id,
      track,
      title: str(b, 'title', LIMITS.title, { required: true })!,
      owner: str(b, 'owner', LIMITS.owner) ?? 'William',
      due: date(b, 'due') ?? null,
      status: status(b) ?? 'not_started',
      notes: str(b, 'notes', LIMITS.notes, { allowEmpty: true }) ?? '',
      sort_order: (last[0]?.sort_order ?? -1) + 1,
    };
    return check(await db().from('items').insert(row).select().single());
  },
});

import { db } from '../_lib/db.js';
import { bad, body, check, idParam, route } from '../_lib/http.js';
import { assertTrack } from '../_lib/projects.js';
import { date, defined, int, LIMITS, status, str } from '../_lib/validate.js';

export default route({
  PATCH: async (req) => {
    const id = idParam(req);
    const b = body(req);
    const patch = defined({
      title: str(b, 'title', LIMITS.title),
      track: str(b, 'track', LIMITS.track),
      owner: str(b, 'owner', LIMITS.owner),
      due: date(b, 'due'),
      status: status(b),
      notes: str(b, 'notes', LIMITS.notes, { allowEmpty: true }),
      sort_order: int(b, 'sort_order'),
    });
    if (!Object.keys(patch).length) throw bad('Nothing to update');
    if (patch.track) {
      const item = check(await db().from('items').select('project_id').eq('id', id).maybeSingle(), 'Item not found');
      await assertTrack(item.project_id, patch.track);
    }
    return check(await db().from('items').update(patch).eq('id', id).select().maybeSingle(), 'Item not found');
  },

  DELETE: async (req) => {
    const id = idParam(req);
    check(await db().from('items').delete().eq('id', id).select('id').maybeSingle(), 'Item not found');
    return { ok: true };
  },
});

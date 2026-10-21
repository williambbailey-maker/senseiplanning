import { db } from '../_lib/db.js';
import { check, idParam, route } from '../_lib/http.js';

export default route({
  DELETE: async (req) => {
    const id = idParam(req);
    check(await db().from('log').delete().eq('id', id).select('id').maybeSingle(), 'Entry not found');
    return { ok: true };
  },
});

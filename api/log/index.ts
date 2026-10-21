import { db } from '../_lib/db.js';
import { bad, body, check, route } from '../_lib/http.js';
import { getProject } from '../_lib/projects.js';
import { LIMITS, str, uuid } from '../_lib/validate.js';

export default route({
  POST: async (req) => {
    const b = body(req);
    const project_id = uuid(b, 'project_id');
    if (!project_id) throw bad('project_id is required');
    await getProject(project_id);
    const row = {
      project_id,
      item_id: uuid(b, 'item_id') ?? null,
      body: str(b, 'body', LIMITS.logBody, { required: true })!,
    };
    if (row.item_id) {
      const item = check(await db().from('items').select('project_id').eq('id', row.item_id).maybeSingle(), 'Item not found');
      if (item.project_id !== project_id) throw bad('Item belongs to another project');
    }
    return check(await db().from('log').insert(row).select().single());
  },
});

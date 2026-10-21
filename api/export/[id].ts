import { db } from '../_lib/db.js';
import { check, idParam, route } from '../_lib/http.js';
import { getProject } from '../_lib/projects.js';

export default route({
  GET: async (req, res) => {
    const id = idParam(req);
    const project = await getProject(id);
    const [items, log] = await Promise.all([
      db().from('items').select('*').eq('project_id', id).order('track').order('sort_order'),
      db().from('log').select('*').eq('project_id', id).order('created_at'),
    ]);
    const slug = String(project.name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'project';
    const stamp = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Disposition', `attachment; filename="plan-${slug}-${stamp}.json"`);
    res
      .status(200)
      .setHeader('Content-Type', 'application/json; charset=utf-8')
      .send(JSON.stringify({ exported_at: new Date().toISOString(), version: 1, project, items: check(items), log: check(log) }, null, 2));
  },
});

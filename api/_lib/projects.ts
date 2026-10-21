import { db } from './db.js';
import { bad, check } from './http.js';

export async function getProject(id: string) {
  return check(await db().from('projects').select('*').eq('id', id).maybeSingle(), 'Project not found');
}

export async function assertTrack(projectId: string, track: string) {
  const p = await getProject(projectId);
  if (!(p.tracks as string[]).includes(track)) throw bad(`Track "${track}" is not in this project`);
  return p;
}

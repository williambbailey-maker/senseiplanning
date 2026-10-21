import type { Item, LogEntry, Project, ProjectSummary } from '../types';
import { navigate } from './router';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      method,
      credentials: 'same-origin',
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, "You're offline. Changes weren't saved.");
  }
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && path !== '/api/login') {
    const here = location.pathname + location.search;
    navigate(here === '/' ? '/login' : `/login?next=${encodeURIComponent(here)}`, { replace: true });
  }
  if (!res.ok) throw new ApiError(res.status, data.error || `Request failed (${res.status})`);
  return data as T;
}

export type ProjectInput = { name: string; target_date: string | null; tracks?: string[]; summary?: string; duplicate_from?: string };
export type ProjectPatch = Partial<Pick<Project, 'name' | 'target_date' | 'summary' | 'archived' | 'tracks'>> & {
  renames?: { from: string; to: string }[];
};
export type ItemInput = Pick<Item, 'project_id' | 'track' | 'title'> & Partial<Pick<Item, 'owner' | 'due' | 'status' | 'notes'>>;
export type ItemPatch = Partial<Pick<Item, 'title' | 'track' | 'owner' | 'due' | 'status' | 'notes' | 'sort_order'>>;

export const api = {
  login: (password: string) => request<{ ok: true }>('POST', '/api/login', { password }),
  logout: () => request<{ ok: true }>('POST', '/api/logout'),
  projects: () => request<ProjectSummary[]>('GET', '/api/projects'),
  project: (id: string) => request<{ project: Project; items: Item[]; log: LogEntry[] }>('GET', `/api/projects/${id}`),
  createProject: (p: ProjectInput) => request<Project>('POST', '/api/projects', p),
  updateProject: (id: string, p: ProjectPatch) => request<Project>('PATCH', `/api/projects/${id}`, p),
  deleteProject: (id: string) => request<{ ok: true }>('DELETE', `/api/projects/${id}`),
  createItem: (i: ItemInput) => request<Item>('POST', '/api/items', i),
  updateItem: (id: string, p: ItemPatch) => request<Item>('PATCH', `/api/items/${id}`, p),
  deleteItem: (id: string) => request<{ ok: true }>('DELETE', `/api/items/${id}`),
  addLog: (project_id: string, body: string, item_id?: string | null) => request<LogEntry>('POST', '/api/log', { project_id, body, item_id }),
  deleteLog: (id: string) => request<{ ok: true }>('DELETE', `/api/log/${id}`),
  exportUrl: (id: string) => `/api/export/${id}`,
};

import { useCallback, useEffect, useState } from 'react';
import type { ProjectSummary } from '../types';
import { api, ApiError } from '../lib/api';
import { daysUntil, fmtLong, fmtShort } from '../lib/dates';
import { linkProps, navigate } from '../lib/router';
import { errText, toast } from '../lib/toast';
import { Empty, ProgressBar, Sheet } from '../components/ui';

export function Projects() {
  const [projects, setProjects] = useState<ProjectSummary[] | null>(null);
  const [error, setError] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    try {
      setProjects(await api.projects());
      setError('');
    } catch (e) {
      if (!(e instanceof ApiError && e.status === 401)) setError(errText(e));
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const logout = async () => {
    await api.logout().catch(() => {});
    if ('caches' in window) await caches.delete('plan-api').catch(() => {});
    navigate('/login', { replace: true });
  };

  const active = projects?.filter((p) => !p.archived) ?? [];
  const archived = projects?.filter((p) => p.archived) ?? [];

  return (
    <div className="wrap">
      <header className="rule-3 flex items-end justify-between gap-4 pb-3.5">
        <h1 className="display text-[clamp(32px,7vw,44px)] leading-none">Plan</h1>
        <button type="button" className="btn-ghost" onClick={logout}>
          Log out
        </button>
      </header>

      <div className="my-[18px] flex flex-wrap items-center gap-2">
        <button type="button" className="chip" aria-pressed={showArchived} onClick={() => setShowArchived((s) => !s)}>
          Archived{archived.length ? ` (${archived.length})` : ''}
        </button>
        <span className="flex-1" />
        <button type="button" className="btn" onClick={() => setCreating(true)}>
          + New project
        </button>
      </div>

      {error && !projects ? (
        <Empty>
          {error}{' '}
          <button className="font-semibold underline" onClick={load}>
            Retry
          </button>
        </Empty>
      ) : !projects ? (
        <Empty>Loading…</Empty>
      ) : (showArchived ? archived : active).length === 0 ? (
        <Empty>{showArchived ? 'No archived projects.' : 'No active projects. Start one with + New project.'}</Empty>
      ) : (
        <div className="grid gap-px border-y border-line bg-line">
          {(showArchived ? archived : active).map((p) => (
            <ProjectCard key={p.id} p={p} />
          ))}
        </div>
      )}

      {creating && projects && (
        <NewProjectSheet
          projects={projects}
          onClose={() => setCreating(false)}
          onCreated={(id) => navigate(`/p/${id}`)}
        />
      )}
    </div>
  );
}

function ProjectCard({ p }: { p: ProjectSummary }) {
  const days = daysUntil(p.target_date);
  return (
    <a {...linkProps(`/p/${p.id}`)} className="block min-w-0 overflow-hidden bg-bg py-4 text-fg no-underline">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="display text-[22px] leading-tight">{p.name}</h2>
          <div className="mt-1 text-[13px] text-muted">{p.target_date ? fmtLong(p.target_date) : 'No target date'}</div>
        </div>
        {days !== null && (
          <div className="shrink-0 text-right">
            <div className={`display mono text-[30px] leading-none ${days < 0 ? 'text-risk' : ''}`}>{Math.abs(days)}</div>
            <div className="text-[11px] uppercase tracking-[0.08em] text-muted">{days < 0 ? 'days past' : days === 1 ? 'day left' : 'days left'}</div>
          </div>
        )}
      </div>
      <div className="mt-3">
        <ProgressBar counts={p.counts} total={p.total} />
      </div>
      <div className="mono mt-1.5 flex flex-wrap gap-x-3 text-xs text-muted">
        <span>{p.done}/{p.total} done</span>
        {p.counts.in_progress > 0 && <span>{p.counts.in_progress} in progress</span>}
        {p.counts.at_risk > 0 && <span className="text-risk">{p.counts.at_risk} at risk</span>}
      </div>
      {p.next_item && (
        <div className="mt-2 flex min-w-0 gap-2 text-[13px]">
          <span className="shrink-0 text-muted">Next</span>
          <span className="min-w-0 truncate font-semibold">{p.next_item.title}</span>
          <span className="mono ml-auto shrink-0 text-muted">{fmtShort(p.next_item.due)}</span>
        </div>
      )}
    </a>
  );
}

function NewProjectSheet({ projects, onClose, onCreated }: { projects: ProjectSummary[]; onClose: () => void; onCreated: (id: string) => void }) {
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [tracks, setTracks] = useState('');
  const [from, setFrom] = useState('');
  const [busy, setBusy] = useState(false);
  const source = projects.find((p) => p.id === from);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const list = tracks.split(',').map((t) => t.trim()).filter(Boolean);
    if (!from && !list.length) return toast('Add at least one track, or duplicate a project');
    setBusy(true);
    try {
      const p = await api.createProject({
        name: name.trim(),
        target_date: target || null,
        ...(from ? { duplicate_from: from } : { tracks: list }),
      });
      onCreated(p.id);
    } catch (err) {
      toast(errText(err));
      setBusy(false);
    }
  };

  return (
    <Sheet title="New project" onClose={onClose}>
      <form className="grid gap-3" onSubmit={submit}>
        <label className="field">
          Name
          <input className="input" autoFocus required maxLength={120} value={name} onChange={(e) => setName(e.target.value)} placeholder="Spring push" />
        </label>
        <label className="field">
          Target date
          <input className="input mono" type="date" value={target} onChange={(e) => setTarget(e.target.value)} />
        </label>
        <label className="field">
          Duplicate structure from…
          <select className="input" value={from} onChange={(e) => setFrom(e.target.value)}>
            <option value="">Start blank</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
                {p.archived ? ' (archived)' : ''}
              </option>
            ))}
          </select>
        </label>
        {source ? (
          <p className="text-[13px] text-muted">
            Copies {source.tracks.length} tracks and {source.total} item titles. Statuses reset, dates and notes cleared.
          </p>
        ) : (
          <label className="field">
            Tracks (comma separated)
            <input className="input" value={tracks} onChange={(e) => setTracks(e.target.value)} placeholder="Product, Legal, Comms" />
          </label>
        )}
        <div className="flex gap-2">
          <button className="btn" type="submit" disabled={busy}>
            {busy ? 'Creating…' : 'Create project'}
          </button>
          <button className="btn-ghost" type="button" onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </Sheet>
  );
}

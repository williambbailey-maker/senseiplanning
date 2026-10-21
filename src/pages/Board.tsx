import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Item, ItemStatus, LogEntry, Project } from '../types';
import { api, ApiError, type ItemPatch } from '../lib/api';
import { daysUntil, fmtLong, fmtStamp, parseDay, today } from '../lib/dates';
import { linkProps, navigate } from '../lib/router';
import { errText, toast } from '../lib/toast';
import { trackColor, trackInitial } from '../lib/tracks';
import { ItemRow } from '../components/ItemRow';
import { Empty, Linkify, ProgressBar, TwoTapButton } from '../components/ui';
import { SettingsSheet } from '../components/SettingsSheet';

type Filter = 'open' | 'week' | 'risk' | 'all';
const FILTERS: { key: Filter; label: string }[] = [
  { key: 'open', label: 'Open' },
  { key: 'week', label: 'Due this week' },
  { key: 'risk', label: 'At risk' },
  { key: 'all', label: 'All' },
];

function matches(it: Item, f: Filter): boolean {
  if (f === 'open') return it.status !== 'done';
  if (f === 'risk') return it.status === 'at_risk';
  if (f === 'week') {
    const d = parseDay(it.due);
    const limit = today();
    limit.setDate(limit.getDate() + 7);
    return it.status !== 'done' && !!d && d <= limit;
  }
  return true;
}

const byDue = (a: Item, b: Item) =>
  (a.due ?? '9999').localeCompare(b.due ?? '9999') || (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.created_at.localeCompare(b.created_at);

export function Board({ id }: { id: string }) {
  const [project, setProject] = useState<Project | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<Filter>('open');
  const [openId, setOpenId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [settings, setSettings] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await api.project(id);
      setProject(r.project);
      setItems(r.items);
      setLog(r.log);
      setError('');
    } catch (e) {
      if (!(e instanceof ApiError && e.status === 401)) setError(errText(e));
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (project) document.title = `${project.name} · Plan`;
    return () => {
      document.title = 'Plan';
    };
  }, [project]);

  /** Optimistic patch: apply locally, revert only the patched fields on failure. */
  const patchItem = useCallback(async (itemId: string, patch: ItemPatch): Promise<boolean> => {
    let before: Partial<Item> = {};
    setItems((xs) =>
      xs.map((x) => {
        if (x.id !== itemId) return x;
        before = Object.fromEntries(Object.keys(patch).map((k) => [k, x[k as keyof Item]]));
        return { ...x, ...patch } as Item;
      }),
    );
    try {
      const saved = await api.updateItem(itemId, patch);
      setItems((xs) => xs.map((x) => (x.id === itemId ? { ...x, ...pick(saved, Object.keys(patch)), completed_at: saved.completed_at, updated_at: saved.updated_at } : x)));
      return true;
    } catch (e) {
      setItems((xs) => xs.map((x) => (x.id === itemId ? ({ ...x, ...before } as Item) : x)));
      toast(errText(e));
      return false;
    }
  }, []);

  const deleteItem = useCallback(async (itemId: string) => {
    let removed: Item | undefined;
    let index = -1;
    setItems((xs) => {
      index = xs.findIndex((x) => x.id === itemId);
      removed = xs[index];
      return xs.filter((x) => x.id !== itemId);
    });
    setOpenId(null);
    try {
      await api.deleteItem(itemId);
    } catch (e) {
      if (removed) setItems((xs) => [...xs.slice(0, index), removed!, ...xs.slice(index)]);
      toast(errText(e));
    }
  }, []);

  const owners = useMemo(() => [...new Set(['William', ...items.map((i) => i.owner)])], [items]);

  if (error && !project) {
    return (
      <div className="wrap">
        <a {...linkProps('/')} className="text-sm font-semibold text-muted no-underline">
          ← Projects
        </a>
        <Empty>
          {error}{' '}
          <button className="font-semibold underline" onClick={load}>
            Retry
          </button>
        </Empty>
      </div>
    );
  }
  if (!project) {
    return (
      <div className="wrap">
        <Empty>Loading…</Empty>
      </div>
    );
  }

  const counts = { done: 0, in_progress: 0, not_started: 0, at_risk: 0 } as Record<ItemStatus, number>;
  for (const i of items) counts[i.status]++;
  const days = daysUntil(project.target_date);
  const visible = items.filter((i) => matches(i, filter));
  const extraTracks = [...new Set(items.map((i) => i.track))].filter((t) => !project.tracks.includes(t));
  const allTracks = [...project.tracks, ...extraTracks];
  const groups = allTracks
    .map((t, idx) => ({ track: t, color: trackColor(idx), rows: visible.filter((i) => i.track === t).sort(byDue), all: items.filter((i) => i.track === t) }))
    .filter((g) => g.rows.length || (filter === 'all' && project.tracks.includes(g.track)));

  return (
    <div className="wrap">
      <div className="mb-3 flex items-center justify-between">
        <a {...linkProps('/')} className="-ml-1 inline-flex min-h-[44px] items-center px-1 text-sm font-semibold text-muted no-underline">
          ← Projects
        </a>
        <button type="button" className="btn-ghost" onClick={() => setSettings(true)}>
          Settings
        </button>
      </div>

      <header className="rule-3 flex flex-wrap items-end justify-between gap-4 pb-3.5">
        <div className="min-w-0">
          <h1 className="display text-[clamp(28px,6vw,40px)] leading-none" style={{ textWrap: 'balance' } as React.CSSProperties}>
            {project.name}
          </h1>
          <div className="mt-1.5 text-sm text-muted">
            {project.target_date ? `Target ${fmtLong(project.target_date)}` : 'No target date'}
            {project.archived && ' · Archived'}
          </div>
        </div>
        {days !== null && (
          <div className="text-right max-[520px]:text-left">
            <div className={`display mono text-[clamp(36px,8vw,52px)] leading-[0.9] ${days < 0 ? 'text-risk' : ''}`}>{Math.abs(days)}</div>
            <div className="text-xs uppercase tracking-[0.08em] text-muted">{days < 0 ? 'days past target' : days === 1 ? 'day left' : 'days left'}</div>
          </div>
        )}
      </header>

      <div className="mb-5 grid grid-cols-2 gap-px border-b border-line bg-line sm:grid-cols-4">
        {(
          [
            ['done', 'Done', 'var(--done)'],
            ['in_progress', 'In progress', 'var(--prog)'],
            ['not_started', 'Not started', 'var(--todo)'],
            ['at_risk', 'At risk', 'var(--risk)'],
          ] as const
        ).map(([k, label, color]) => (
          <div key={k} className="bg-bg px-1 pb-2.5 pt-3">
            <div className="mono text-2xl font-semibold">{counts[k]}</div>
            <div className="flex items-center gap-1.5 text-xs text-muted">
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: color }} />
              {label}
            </div>
          </div>
        ))}
      </div>
      <div className="mb-[18px]">
        <ProgressBar counts={counts} total={items.length} />
      </div>

      <div className="mb-[18px] flex flex-wrap items-center gap-2" role="toolbar" aria-label="Filter">
        {FILTERS.map((f) => (
          <button key={f.key} type="button" className="chip" aria-pressed={filter === f.key} onClick={() => setFilter(f.key)}>
            {f.label}
          </button>
        ))}
        <span className="flex-1" />
        <button type="button" className="btn" onClick={() => setAdding((a) => !a)}>
          + Add item
        </button>
      </div>

      {adding && (
        <AddItem
          project={project}
          owners={owners}
          onCancel={() => setAdding(false)}
          onAdded={(it) => {
            setItems((xs) => [...xs, it]);
            setAdding(false);
          }}
        />
      )}

      {items.length === 0 ? (
        <Empty>No items yet. Use + Add item to start the board.</Empty>
      ) : groups.length === 0 ? (
        <Empty>Nothing matches this filter.</Empty>
      ) : (
        groups.map((g) => (
          <section key={g.track} className="mb-[26px]">
            <div className="rule-2 flex items-center gap-2.5 pb-1.5">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-sm font-extrabold text-white" style={{ background: g.color }}>
                {trackInitial(g.track)}
              </span>
              <h2 className="text-[17px] font-bold">{g.track}</h2>
              <span className="mono ml-auto text-xs text-muted">
                {g.all.filter((i) => i.status === 'done').length}/{g.all.length}
              </span>
            </div>
            {g.rows.length === 0 && <div className="rule-1 py-3 text-sm text-muted">No items</div>}
            {g.rows.map((it) => (
              <ItemRow
                key={it.id}
                item={it}
                open={openId === it.id}
                tracks={project.tracks}
                owners={owners}
                onToggle={() => setOpenId((o) => (o === it.id ? null : it.id))}
                onPatch={(p) => patchItem(it.id, p)}
                onDelete={() => deleteItem(it.id)}
              />
            ))}
          </section>
        ))
      )}

      <LogSection projectId={project.id} log={log} setLog={setLog} />

      {settings && (
        <SettingsSheet
          project={project}
          items={items}
          onClose={() => setSettings(false)}
          onSaved={(p, renames) => {
            setProject(p);
            if (renames.length) {
              const map = new Map(renames.map((r) => [r.from, r.to]));
              setItems((xs) => xs.map((x) => (map.has(x.track) ? { ...x, track: map.get(x.track)! } : x)));
            }
          }}
          onDeleted={() => navigate('/', { replace: true })}
        />
      )}
    </div>
  );
}

function pick<T extends object>(o: T, keys: string[]): Partial<T> {
  return Object.fromEntries(keys.filter((k) => k in o).map((k) => [k, o[k as keyof T]])) as Partial<T>;
}

function AddItem({ project, owners, onCancel, onAdded }: { project: Project; owners: string[]; onCancel: () => void; onAdded: (i: Item) => void }) {
  const [title, setTitle] = useState('');
  const [track, setTrack] = useState(project.tracks[0] ?? '');
  const [owner, setOwner] = useState('William');
  const [due, setDue] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !track) return;
    setBusy(true);
    try {
      onAdded(await api.createItem({ project_id: project.id, title: title.trim(), track, owner: owner.trim() || 'William', due: due || null }));
    } catch (err) {
      toast(errText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="reveal mb-5 grid gap-2.5 border border-line bg-panel p-3.5" onSubmit={submit}>
      <label className="field">
        Item
        <input className="input" autoFocus required maxLength={300} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What needs to happen" />
      </label>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        <label className="field">
          Track
          <select className="input" value={track} onChange={(e) => setTrack(e.target.value)}>
            {project.tracks.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        <label className="field">
          Owner
          <input className="input" list="add-owners" maxLength={60} value={owner} onChange={(e) => setOwner(e.target.value)} />
          <datalist id="add-owners">
            {owners.map((o) => (
              <option key={o} value={o} />
            ))}
          </datalist>
        </label>
        <label className="field col-span-2 sm:col-span-1">
          Due
          <input className="input mono" type="date" value={due} onChange={(e) => setDue(e.target.value)} />
        </label>
      </div>
      <div className="flex gap-2">
        <button className="btn" type="submit" disabled={busy}>
          {busy ? 'Adding…' : 'Add'}
        </button>
        <button className="btn-ghost" type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function LogSection({ projectId, log, setLog }: { projectId: string; log: LogEntry[]; setLog: React.Dispatch<React.SetStateAction<LogEntry[]>> }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    setBusy(true);
    try {
      const entry = await api.addLog(projectId, body);
      setLog((l) => [entry, ...l]);
      setText('');
    } catch (err) {
      toast(errText(err));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (entry: LogEntry) => {
    setLog((l) => l.filter((x) => x.id !== entry.id));
    try {
      await api.deleteLog(entry.id);
    } catch (err) {
      setLog((l) => [...l, entry].sort((a, b) => b.created_at.localeCompare(a.created_at)));
      toast(errText(err));
    }
  };

  return (
    <section className="mt-9">
      <h2 className="rule-2 pb-1.5 text-[17px] font-bold">Notes &amp; resources</h2>
      <p className="mb-2.5 mt-2 text-[13px] text-muted">Drop links, decisions, contacts. URLs become links.</p>
      <form className="mb-2 grid gap-2" onSubmit={submit}>
        <textarea className="input !min-h-[60px]" maxLength={10000} value={text} onChange={(e) => setText(e.target.value)} placeholder="Note or link" />
        <div className="flex justify-end">
          <button className="btn" type="submit" disabled={busy || !text.trim()}>
            {busy ? 'Saving…' : 'Save note'}
          </button>
        </div>
      </form>
      {log.length === 0 ? (
        <Empty>No notes yet.</Empty>
      ) : (
        log.map((n) => (
          <div key={n.id} className="rule-1 grid grid-cols-[1fr_auto] items-start gap-2 py-2.5">
            <div className="min-w-0">
              <div className="whitespace-pre-wrap break-words">
                <Linkify text={n.body} />
              </div>
              <div className="mono mt-0.5 text-xs text-muted">{fmtStamp(n.created_at)}</div>
            </div>
            <TwoTapButton
              onConfirm={() => remove(n)}
              label={<span aria-label="Delete note">×</span>}
              armedLabel="Delete?"
              className="min-h-[44px] min-w-[44px] text-xl text-muted"
              armedClassName="min-h-[44px] px-2 text-xs font-bold text-risk"
            />
          </div>
        ))
      )}
    </section>
  );
}

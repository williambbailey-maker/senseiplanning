import { useState } from 'react';
import type { Item, Project } from '../types';
import { api } from '../lib/api';
import { errText, toast } from '../lib/toast';
import { trackColor, trackInitial } from '../lib/tracks';
import { Sheet, TwoTapButton } from './ui';

type Row = { key: number; orig: string | null; name: string };

export function SettingsSheet({
  project,
  items,
  onClose,
  onSaved,
  onDeleted,
}: {
  project: Project;
  items: Item[];
  onClose: () => void;
  onSaved: (p: Project, renames: { from: string; to: string }[]) => void;
  onDeleted: () => void;
}) {
  const [name, setName] = useState(project.name);
  const [target, setTarget] = useState(project.target_date ?? '');
  const [summary, setSummary] = useState(project.summary ?? '');
  const [rows, setRows] = useState<Row[]>(() => project.tracks.map((t, i) => ({ key: i, orig: t, name: t })));
  const [nextKey, setNextKey] = useState(project.tracks.length);
  const [busy, setBusy] = useState(false);

  const inUse = (t: string | null) => !!t && items.some((i) => i.track === t);
  const move = (i: number, d: -1 | 1) =>
    setRows((r) => {
      const j = i + d;
      if (j < 0 || j >= r.length) return r;
      const next = [...r];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  const save = async () => {
    const tracks = rows.map((r) => r.name.trim());
    if (!name.trim()) return toast('Name is required');
    if (!tracks.length || tracks.some((t) => !t)) return toast('Track names can’t be empty');
    if (new Set(tracks.map((t) => t.toLowerCase())).size !== tracks.length) return toast('Track names must be unique');
    const renames = rows.filter((r) => r.orig && r.orig !== r.name.trim()).map((r) => ({ from: r.orig!, to: r.name.trim() }));
    setBusy(true);
    try {
      const p = await api.updateProject(project.id, { name: name.trim(), target_date: target || null, summary, tracks, renames });
      onSaved(p, renames);
      toast('Saved');
      onClose();
    } catch (e) {
      toast(errText(e));
    } finally {
      setBusy(false);
    }
  };

  const setArchived = async (archived: boolean) => {
    try {
      onSaved(await api.updateProject(project.id, { archived }), []);
      onClose();
    } catch (e) {
      toast(errText(e));
    }
  };

  const remove = async () => {
    try {
      await api.deleteProject(project.id);
      onDeleted();
    } catch (e) {
      toast(errText(e));
    }
  };

  return (
    <Sheet title="Project settings" onClose={onClose}>
      <div className="grid gap-3">
        <label className="field">
          Name
          <input className="input" maxLength={120} value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="field">
          Target date
          <input className="input mono" type="date" value={target} onChange={(e) => setTarget(e.target.value)} />
        </label>
        <label className="field">
          Summary
          <textarea className="input !min-h-[60px]" maxLength={2000} value={summary} onChange={(e) => setSummary(e.target.value)} />
        </label>

        <div className="field">Tracks</div>
        <div className="-mt-2">
          {rows.map((r, i) => (
            <div key={r.key} className="rule-1 flex items-center gap-1.5 py-1.5">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-sm font-extrabold text-white" style={{ background: trackColor(i) }}>
                {trackInitial(r.name || '?')}
              </span>
              <input
                className="input"
                aria-label={`Track ${i + 1} name`}
                maxLength={40}
                value={r.name}
                onChange={(e) => setRows((rs) => rs.map((x) => (x.key === r.key ? { ...x, name: e.target.value } : x)))}
              />
              <button type="button" className="btn-ghost w-11 shrink-0 px-0" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up">
                ↑
              </button>
              <button type="button" className="btn-ghost w-11 shrink-0 px-0" onClick={() => move(i, 1)} disabled={i === rows.length - 1} aria-label="Move down">
                ↓
              </button>
              <button
                type="button"
                className="btn-ghost w-11 shrink-0 px-0"
                onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}
                disabled={inUse(r.orig) || rows.length === 1}
                title={inUse(r.orig) ? 'Move or delete this track’s items first' : 'Remove track'}
                aria-label="Remove track"
              >
                ×
              </button>
            </div>
          ))}
          <button
            type="button"
            className="btn-ghost mt-2"
            onClick={() => {
              setRows((rs) => [...rs, { key: nextKey, orig: null, name: '' }]);
              setNextKey((k) => k + 1);
            }}
          >
            + Add track
          </button>
          <p className="mt-2 text-xs text-muted">Tracks with items can’t be removed. Renaming a track moves its items with it.</p>
        </div>

        <div className="flex gap-2">
          <button type="button" className="btn" onClick={save} disabled={busy}>
            {busy ? 'Saving…' : 'Save changes'}
          </button>
          <button type="button" className="btn-ghost" onClick={onClose}>
            Cancel
          </button>
        </div>

        <div className="rule-2 mt-4 pb-1.5 text-[17px] font-bold">More</div>
        <div className="flex flex-wrap gap-2">
          <a className="btn-ghost no-underline" href={api.exportUrl(project.id)} download>
            Export JSON
          </a>
          <button type="button" className="btn-ghost" onClick={() => setArchived(!project.archived)}>
            {project.archived ? 'Unarchive' : 'Archive'}
          </button>
          <TwoTapButton onConfirm={remove} label="Delete project" armedLabel="Tap again: delete everything" />
        </div>
      </div>
    </Sheet>
  );
}

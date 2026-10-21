import { useEffect, useState } from 'react';
import type { Item, ItemStatus } from '../types';
import { dueTone, fmtShort } from '../lib/dates';
import { NEXT_STATUS, STATUSES } from '../lib/tracks';
import { Linkify, StatusButton, TwoTapButton, urlsIn } from './ui';
import type { ItemPatch } from '../lib/api';

type Props = {
  item: Item;
  open: boolean;
  tracks: string[];
  owners: string[];
  onToggle: () => void;
  onPatch: (patch: ItemPatch) => Promise<boolean>;
  onDelete: () => void;
};

export function ItemRow({ item, open, tracks, owners, onToggle, onPatch, onDelete }: Props) {
  const done = item.status === 'done';
  const tone = dueTone(item.due, done);
  const firstNote = (item.notes ?? '').split('\n')[0].trim();
  return (
    <div className="rule-1">
      <div className="grid min-h-[56px] grid-cols-[auto_1fr_auto] items-center gap-3 py-2.5">
        <StatusButton status={item.status} onClick={() => onPatch({ status: NEXT_STATUS[item.status] })} />
        <button type="button" className="min-w-0 py-1 text-left" onClick={onToggle} aria-expanded={open}>
          <span className={`block font-semibold ${done ? 'text-muted line-through decoration-1' : ''}`}>{item.title}</span>
          <span className="mt-0.5 flex min-w-0 gap-1.5 text-[12.5px] text-muted">
            <span className="shrink-0">{item.owner}</span>
            {firstNote && <span className="truncate">· {firstNote}</span>}
          </span>
        </button>
        <span
          className={`mono whitespace-nowrap text-right text-[12.5px] ${
            tone === 'over' ? 'font-semibold text-risk' : tone === 'soon' ? 'font-bold text-fg' : 'text-muted'
          }`}
        >
          {fmtShort(item.due)}
        </span>
      </div>
      {open && <ItemEditor item={item} tracks={tracks} owners={owners} onPatch={onPatch} onDelete={onDelete} onClose={onToggle} />}
    </div>
  );
}

function ItemEditor({
  item,
  tracks,
  owners,
  onPatch,
  onDelete,
  onClose,
}: Pick<Props, 'item' | 'tracks' | 'owners' | 'onPatch' | 'onDelete'> & { onClose: () => void }) {
  const [title, setTitle] = useState(item.title);
  const [owner, setOwner] = useState(item.owner);
  const [notes, setNotes] = useState(item.notes ?? '');
  const [saved, setSaved] = useState<'' | 'saving' | 'saved' | 'error'>('');

  // Keep local drafts in sync when the item changes underneath (e.g. a revert).
  useEffect(() => setTitle(item.title), [item.title]);
  useEffect(() => setOwner(item.owner), [item.owner]);
  useEffect(() => setNotes(item.notes ?? ''), [item.notes]);

  const save = async (patch: ItemPatch) => {
    setSaved('saving');
    setSaved((await onPatch(patch)) ? 'saved' : 'error');
  };

  const trackOptions = tracks.includes(item.track) ? tracks : [...tracks, item.track];
  const listId = `owners-${item.id}`;

  return (
    <div className="reveal mb-3 grid gap-3 border border-line bg-panel p-3.5">
      <label className="field">
        Item
        <input
          className="input"
          value={title}
          maxLength={300}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => title.trim() && title.trim() !== item.title && save({ title: title.trim() })}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        />
      </label>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <label className="field">
          Status
          <select className="input" value={item.status} onChange={(e) => save({ status: e.target.value as ItemStatus })}>
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Track
          <select className="input" value={item.track} onChange={(e) => save({ track: e.target.value })}>
            {trackOptions.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        <label className="field">
          Owner
          <input
            className="input"
            list={listId}
            value={owner}
            maxLength={60}
            onChange={(e) => setOwner(e.target.value)}
            onBlur={() => owner.trim() && owner.trim() !== item.owner && save({ owner: owner.trim() })}
          />
          <datalist id={listId}>
            {owners.map((o) => (
              <option key={o} value={o} />
            ))}
          </datalist>
        </label>
        <label className="field">
          Due
          <input className="input mono" type="date" value={item.due ?? ''} onChange={(e) => save({ due: e.target.value || null })} />
        </label>
      </div>
      <label className="field">
        Notes
        <textarea
          className="input"
          value={notes}
          maxLength={10000}
          placeholder="Notes, decisions, links"
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => notes !== (item.notes ?? '') && save({ notes })}
        />
      </label>
      {urlsIn(notes).length > 0 && (
        <div className="flex flex-col gap-1 text-[13px]">
          {urlsIn(notes).map((u, i) => (
            <Linkify key={i} text={u} />
          ))}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="btn" onClick={onClose}>
          Done
        </button>
        <TwoTapButton onConfirm={onDelete} />
        <span className={`ml-auto text-xs ${saved === 'error' ? 'text-risk' : 'text-muted'}`} aria-live="polite">
          {saved === 'saving' ? 'Saving…' : saved === 'saved' ? 'Saved' : saved === 'error' ? 'Not saved' : ''}
        </span>
      </div>
    </div>
  );
}

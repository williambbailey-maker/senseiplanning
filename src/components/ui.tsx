import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useToasts } from '../lib/toast';
import type { ItemStatus } from '../types';
import { statusLabel } from '../lib/tracks';

const URL_RE = /(https?:\/\/[^\s<>()]+[^\s<>().,;:!?'"])/g;

export function urlsIn(text: string | null | undefined): string[] {
  return String(text ?? '').match(URL_RE) ?? [];
}

/** Renders text with URLs turned into links. */
export function Linkify({ text }: { text: string }) {
  const parts = text.split(URL_RE);
  return (
    <>
      {parts.map((p, i) =>
        i % 2 ? (
          <a key={i} href={p} target="_blank" rel="noopener noreferrer" className="break-all underline-offset-2 hover:underline">
            {p}
          </a>
        ) : (
          p
        ),
      )}
    </>
  );
}

export function StatusButton({ status, onClick, disabled }: { status: ItemStatus; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      className="status"
      data-s={status}
      onClick={onClick}
      disabled={disabled}
      aria-label={`Status: ${statusLabel(status)}. Tap to change.`}
      title={statusLabel(status)}
    >
      <span />
    </button>
  );
}

/** Stacked bar: done / in progress / at risk over the total. */
export function ProgressBar({ counts, total, height = 6 }: { counts: Record<ItemStatus, number>; total: number; height?: number }) {
  const pct = (n: number) => `${total ? (100 * n) / total : 0}%`;
  return (
    <div className="flex overflow-hidden bg-line" style={{ height }} aria-hidden="true">
      <i className="block bg-done" style={{ width: pct(counts.done) }} />
      <i className="block bg-prog" style={{ width: pct(counts.in_progress) }} />
      <i className="block bg-risk" style={{ width: pct(counts.at_risk) }} />
    </div>
  );
}

/** First tap arms, second tap within 4s confirms. */
export function TwoTapButton({
  onConfirm,
  label = 'Delete',
  armedLabel = 'Tap again to delete',
  className = 'btn-ghost',
  armedClassName = 'btn-danger',
}: {
  onConfirm: () => void;
  label?: ReactNode;
  armedLabel?: ReactNode;
  className?: string;
  armedClassName?: string;
}) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(t);
  }, [armed]);
  return (
    <button
      type="button"
      className={armed ? armedClassName : className}
      onClick={() => (armed ? (setArmed(false), onConfirm()) : setArmed(true))}
    >
      {armed ? armedLabel : label}
    </button>
  );
}

export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      prev?.focus?.();
    };
  }, [onClose]);
  return (
    <>
      <div className="sheet-backdrop" onClick={onClose} />
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={ref}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="display text-2xl">{title}</h2>
          <button type="button" className="btn-ghost w-11 px-0 text-xl" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        {children}
      </div>
    </>
  );
}

export function Toasts() {
  const toasts = useToasts();
  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-[60] flex flex-col items-center gap-2 px-4"
      style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)' }}
      aria-live="polite"
    >
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto max-w-md bg-fg px-4 py-3 text-sm font-semibold text-bg" style={{ borderLeft: '4px solid var(--risk)' }}>
          {t.text}
        </div>
      ))}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="rule-1 py-7 text-center text-muted">{children}</div>;
}

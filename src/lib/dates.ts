const DAY = 86_400_000;

export function today(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function parseDay(s: string | null | undefined): Date | null {
  if (!s) return null;
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function daysUntil(s: string | null | undefined): number | null {
  const d = parseDay(s);
  return d ? Math.round((d.getTime() - today().getTime()) / DAY) : null;
}

export function fmtShort(s: string | null | undefined): string {
  const d = parseDay(s);
  return d ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—';
}

export function fmtLong(s: string | null | undefined): string {
  const d = parseDay(s);
  return d ? d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : 'No target date';
}

export function fmtStamp(iso: string): string {
  const d = new Date(iso);
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: sameYear ? undefined : 'numeric' });
}

export type DueTone = 'over' | 'soon' | 'normal' | 'none';

/** Overdue → red; within 3 days → bold. Done items are never flagged. */
export function dueTone(due: string | null, done: boolean): DueTone {
  const n = daysUntil(due);
  if (n === null) return 'none';
  if (done) return 'normal';
  if (n < 0) return 'over';
  if (n <= 3) return 'soon';
  return 'normal';
}

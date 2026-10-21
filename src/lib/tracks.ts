import type { ItemStatus } from '../types';

export const TRACK_COLORS = ['#0039A6', '#996633', '#FF6319', '#B933AD', '#6CBE45', '#00933C', '#00A1DE', '#808183'];

export const trackColor = (index: number) => TRACK_COLORS[((index % TRACK_COLORS.length) + TRACK_COLORS.length) % TRACK_COLORS.length];

/** Bullet label: "Day 30" → "30", otherwise the first letter. */
export function trackInitial(name: string): string {
  const num = /(\d+)\s*$/.exec(name);
  if (num && num[1].length <= 3) return num[1];
  return (name.trim()[0] ?? '?').toUpperCase();
}

export const STATUSES: { value: ItemStatus; label: string }[] = [
  { value: 'not_started', label: 'Not started' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'done', label: 'Done' },
  { value: 'at_risk', label: 'At risk' },
];

export const statusLabel = (s: ItemStatus) => STATUSES.find((x) => x.value === s)?.label ?? s;

/** Tap cycle: not started → in progress → done → not started. At risk is set in the editor; tapping it resumes work. */
export const NEXT_STATUS: Record<ItemStatus, ItemStatus> = {
  not_started: 'in_progress',
  in_progress: 'done',
  done: 'not_started',
  at_risk: 'in_progress',
};

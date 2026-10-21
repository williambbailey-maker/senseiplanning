export type { ItemRow as Item, ItemStatus, LogRow as LogEntry, ProjectRow as Project } from '../api/_lib/types';
import type { ItemStatus, ProjectRow } from '../api/_lib/types';

export type ProjectSummary = ProjectRow & {
  counts: Record<ItemStatus, number>;
  total: number;
  open: number;
  done: number;
  next_item: { id: string; title: string; due: string | null; track: string; status: ItemStatus } | null;
};

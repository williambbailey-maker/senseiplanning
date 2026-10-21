// Row types for the `plan` schema (see supabase/migrations/001_plan.sql).

export type ItemStatus = 'not_started' | 'in_progress' | 'done' | 'at_risk';

export type ProjectRow = {
  id: string;
  name: string;
  target_date: string | null;
  summary: string | null;
  tracks: string[];
  archived: boolean;
  created_at: string;
  updated_at: string;
};

export type ItemRow = {
  id: string;
  project_id: string;
  track: string;
  title: string;
  owner: string;
  due: string | null;
  status: ItemStatus;
  notes: string | null;
  sort_order: number | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type LogRow = {
  id: string;
  project_id: string;
  item_id: string | null;
  body: string;
  created_at: string;
};

type Table<R, Req extends keyof R> = {
  Row: R;
  Insert: Partial<R> & Pick<R, Req>;
  Update: Partial<R>;
  Relationships: [];
};

export type Database = {
  plan: {
    Tables: {
      projects: Table<ProjectRow, 'name'>;
      items: Table<ItemRow, 'project_id' | 'track' | 'title'>;
      log: Table<LogRow, 'project_id' | 'body'>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

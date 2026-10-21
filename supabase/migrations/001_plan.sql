-- Plan: private planning tool. Everything lives in the `plan` schema.
-- This file must never reference any other schema.

create schema if not exists plan;

create table plan.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  target_date date,
  summary text default '',
  tracks text[] not null default '{}',        -- ordered track names for this project
  archived boolean not null default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table plan.items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references plan.projects(id) on delete cascade,
  track text not null,
  title text not null,
  owner text not null default 'William',
  due date,
  status text not null default 'not_started'
    check (status in ('not_started','in_progress','done','at_risk')),
  notes text default '',
  sort_order int default 0,
  completed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table plan.log (                        -- notes & resources per project
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references plan.projects(id) on delete cascade,
  item_id uuid references plan.items(id) on delete set null,
  body text not null,
  created_at timestamptz default now()
);

create index items_project_idx on plan.items (project_id);
create index log_project_idx on plan.log (project_id, created_at desc);
create index log_item_idx on plan.log (item_id);

-- Triggers ------------------------------------------------------------------

create or replace function plan.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function plan.set_completed_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'done' then
    if tg_op = 'INSERT' or old.status is distinct from 'done' then
      new.completed_at := now();
    end if;
  else
    new.completed_at := null;
  end if;
  return new;
end;
$$;

create trigger projects_touch before update on plan.projects
  for each row execute function plan.touch_updated_at();

create trigger items_touch before update on plan.items
  for each row execute function plan.touch_updated_at();

create trigger items_completed before insert or update of status on plan.items
  for each row execute function plan.set_completed_at();

-- Lockdown ------------------------------------------------------------------
-- RLS on, no policies: only service_role (which bypasses RLS) can read or write.

alter table plan.projects enable row level security;
alter table plan.items enable row level security;
alter table plan.log enable row level security;

revoke all on schema plan from anon, authenticated;
revoke all on all tables in schema plan from anon, authenticated;
revoke all on all functions in schema plan from anon, authenticated;
alter default privileges in schema plan revoke all on tables from anon, authenticated;
alter default privileges in schema plan revoke all on functions from anon, authenticated;

grant usage on schema plan to service_role;
grant all on all tables in schema plan to service_role;
alter default privileges in schema plan grant all on tables to service_role;

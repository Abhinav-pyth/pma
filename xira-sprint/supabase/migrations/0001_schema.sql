-- SprintDesk core schema
create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  avatar_url text,
  timezone text not null default 'Asia/Kolkata',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  owner_id uuid not null references public.profiles(id) on delete restrict,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create type public.workspace_role as enum ('owner','admin','team_lead','member');
create type public.membership_status as enum ('active','deactivated');

create table public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.workspace_role not null default 'member',
  status public.membership_status not null default 'active',
  joined_at timestamptz not null default now(),
  last_active_at timestamptz,
  unique (workspace_id, user_id)
);

create type public.invitation_status as enum ('pending','accepted','expired','revoked');

create table public.workspace_invitations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  email text not null check (email = lower(trim(email))),
  role public.workspace_role not null default 'member',
  status public.invitation_status not null default 'pending',
  inviter_id uuid not null references public.profiles(id) on delete cascade,
  token uuid not null default gen_random_uuid(),
  expires_at timestamptz not null default now() + interval '7 days',
  created_at timestamptz not null default now(),
  unique (workspace_id, email)
);

create type public.project_status as enum ('active','archived');

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  description text,
  status public.project_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create type public.sprint_status as enum ('planned','active','completed');

create table public.sprints (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  name text not null,
  goal text,
  description text,
  start_date date not null,
  end_date date not null,
  status public.sprint_status not null default 'planned',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date >= start_date)
);

create type public.task_status as enum ('backlog','todo','in_progress','in_review','blocked','done');
create type public.task_priority as enum ('low','medium','high','urgent');
create type public.task_type as enum ('feature','bug','improvement','chore');

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  sprint_id uuid references public.sprints(id) on delete set null,
  parent_task_id uuid references public.tasks(id) on delete set null,
  title text not null check (length(trim(title)) > 0),
  description text,
  assignee_id uuid references public.profiles(id) on delete set null,
  creator_id uuid not null references public.profiles(id) on delete cascade,
  status public.task_status not null default 'todo',
  priority public.task_priority not null default 'medium',
  task_type public.task_type,
  labels text[] not null default '{}',
  start_date date,
  due_date date,
  estimated_hours numeric(6,2) check (estimated_hours is null or estimated_hours >= 0),
  story_points integer check (story_points is null or story_points >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);
create index tasks_workspace_idx on public.tasks (workspace_id);
create index tasks_status_idx on public.tasks (workspace_id, status);
create index tasks_assignee_idx on public.tasks (assignee_id);
create index tasks_sprint_idx on public.tasks (sprint_id);
create index tasks_due_idx on public.tasks (workspace_id, due_date);

create table public.task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index task_comments_task_idx on public.task_comments (task_id);

create table public.task_activity (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  actor_id uuid not null references public.profiles(id) on delete cascade,
  action text not null,
  previous_values jsonb,
  new_values jsonb,
  created_at timestamptz not null default now()
);
create index task_activity_task_idx on public.task_activity (task_id, created_at desc);

create table public.daily_plans (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  plan_date date not null,
  note text,
  weekly_goal text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, user_id, plan_date)
);

create type public.plan_status as enum ('planned','in_progress','completed','moved');

create table public.daily_plan_tasks (
  id uuid primary key default gen_random_uuid(),
  daily_plan_id uuid not null references public.daily_plans(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  position int not null default 0,
  status public.plan_status not null default 'planned',
  planned_start time,
  planned_end time,
  unique (daily_plan_id, task_id)
);

create type public.event_type as enum ('personal','team_meeting','sprint_planning','daily_scrum','sprint_review','sprint_retro','task_deadline','custom_reminder');

create table public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  creator_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  event_type public.event_type not null default 'personal',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  all_day boolean not null default false,
  timezone text not null default 'Asia/Kolkata',
  project_id uuid references public.projects(id) on delete set null,
  sprint_id uuid references public.sprints(id) on delete set null,
  task_id uuid references public.tasks(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at >= starts_at)
);
create index calendar_ws_time_idx on public.calendar_events (workspace_id, starts_at);

create type public.attendance_status as enum ('invited','accepted','declined','maybe');

create table public.calendar_event_attendees (
  event_id uuid not null references public.calendar_events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status public.attendance_status not null default 'invited',
  primary key (event_id, user_id)
);

create table public.daily_scrum_updates (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  scrum_date date not null,
  sprint_id uuid references public.sprints(id) on delete set null,
  yesterday text not null default '',
  today text not null default '',
  blockers text not null default '',
  has_blocker boolean not null default false,
  submitted boolean not null default true,
  edit_history jsonb not null default '[]'::jsonb,
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, user_id, scrum_date)
);
create index scrum_ws_date_idx on public.daily_scrum_updates (workspace_id, scrum_date);

create table public.daily_scrum_tasks (
  scrum_update_id uuid not null references public.daily_scrum_updates(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  association text not null default 'worked_on' check (association in ('worked_on','planned','blocked')),
  primary key (scrum_update_id, task_id)
);

create type public.note_visibility as enum ('private','workspace');

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  creator_id uuid not null references public.profiles(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  sprint_id uuid references public.sprints(id) on delete set null,
  task_id uuid references public.tasks(id) on delete set null,
  calendar_event_id uuid references public.calendar_events(id) on delete set null,
  title text not null,
  content text not null default '',
  visibility public.note_visibility not null default 'private',
  pinned boolean not null default false,
  archived boolean not null default false,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index notes_ws_idx on public.notes (workspace_id);

create type public.notification_type as enum ('task_assigned','due_soon','task_blocked','invitation','sprint_ending','comment');

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  type public.notification_type not null,
  title text not null,
  body text,
  link text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, read, created_at desc);

-- updated_at trigger
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create trigger trg_profiles_updated before update on public.profiles for each row execute function public.set_updated_at();
create trigger trg_workspaces_updated before update on public.workspaces for each row execute function public.set_updated_at();
create trigger trg_projects_updated before update on public.projects for each row execute function public.set_updated_at();
create trigger trg_sprints_updated before update on public.sprints for each row execute function public.set_updated_at();
create trigger trg_tasks_updated before update on public.tasks for each row execute function public.set_updated_at();
create trigger trg_task_comments_updated before update on public.task_comments for each row execute function public.set_updated_at();
create trigger trg_calendar_events_updated before update on public.calendar_events for each row execute function public.set_updated_at();
create trigger trg_notes_updated before update on public.notes for each row execute function public.set_updated_at();
create trigger trg_daily_plans_updated before update on public.daily_plans for each row execute function public.set_updated_at();
create trigger trg_scrum_updated before update on public.daily_scrum_updates for each row execute function public.set_updated_at();

-- completed_at maintenance on tasks
create or replace function public.task_completed_at() returns trigger
language plpgsql as $$
begin
  if new.status = 'done' and old.status is distinct from 'done' then new.completed_at = now();
  elsif new.status <> 'done' then new.completed_at = null;
  end if;
  return new;
end $$;
create trigger trg_tasks_completed before update on public.tasks for each row execute function public.task_completed_at();

-- track last activity when a profile row is touched (called via RPC)
create or replace function public.touch_last_active() returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.workspace_members set last_active_at = now()
   where user_id = auth.uid() and status = 'active';
end $$;

-- Security helper functions (no recursion into policies on the same table)
create or replace function public.is_workspace_member(ws uuid, uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.workspace_members m
    where m.workspace_id = ws and m.user_id = uid and m.status = 'active'
  );
$$;

create or replace function public.current_is_member(ws uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_workspace_member(ws, auth.uid());
$$;

create or replace function public.current_role_in(ws uuid)
returns public.workspace_role language sql stable security definer set search_path = public as $$
  select m.role from public.workspace_members m
  where m.workspace_id = ws and m.user_id = auth.uid() and m.status = 'active'
  limit 1;
$$;

create or replace function public.is_manager_in(ws uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.current_role_in(ws) in ('owner','admin','team_lead');
$$;

create or replace function public.is_admin_in(ws uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.current_role_in(ws) in ('owner','admin');
$$;

revoke execute on function public.touch_last_active() from anon;

-- Create workspace + owner membership atomically
create or replace function public.create_workspace(ws_name text)
returns uuid language plpgsql security definer set search_path = public as $$
declare new_id uuid; slug text; base text; i int := 0;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  base := lower(regexp_replace(trim(ws_name), '[^a-zA-Z0-9]+', '-', 'g'));
  base := trim(both '-' from base);
  if base = '' then raise exception 'invalid workspace name'; end if;
  loop
    slug := case when i = 0 then base else base || '-' || i::text end;
    select id into new_id from public.workspaces where slug = slug;
    exit when new_id is null;
    i := i + 1;
  end loop;
  insert into public.workspaces (name, slug, owner_id)
    values (trim(ws_name), slug, auth.uid()) returning id into new_id;
  insert into public.workspace_members (workspace_id, user_id, role)
    values (new_id, auth.uid(), 'owner');
  return new_id;
end $$;

-- Accept invitation by token
create or replace function public.accept_invitation(invite_token uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare inv public.workspace_invitations%rowtype; uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not authenticated'; end if;
  select * into inv from public.workspace_invitations where token = invite_token;
  if not found then raise exception 'invitation not found'; end if;
  if inv.status <> 'pending' or inv.expires_at < now() then
    update public.workspace_invitations set status = 'expired' where id = inv.id;
    raise exception 'invitation is no longer valid';
  end if;
  if lower(coalesce((select email from auth.users where id = uid),'')) <> inv.email then
    raise exception 'invitation was issued to a different email';
  end if;
  insert into public.workspace_members (workspace_id, user_id, role)
    values (inv.workspace_id, uid, inv.role) on conflict (workspace_id, user_id)
    do update set status = 'active';
  update public.workspace_invitations set status = 'accepted' where id = inv.id;
  return inv.workspace_id;
end $$;

-- Upsert scrum update with edit-history preservation
create or replace function public.upsert_scrum_update(
  ws uuid, sdate date, sid uuid, y text, t text, b text, task_ids jsonb default '[]'::jsonb
) returns uuid language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); rec uuid; hist jsonb;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  if not public.is_workspace_member(ws, uid) then raise exception 'not a member of this workspace'; end if;
  select id into rec from public.daily_scrum_updates
   where workspace_id = ws and user_id = uid and scrum_date = sdate;
  if rec is null then
    insert into public.daily_scrum_updates (workspace_id, user_id, scrum_date, sprint_id, yesterday, today, blockers, has_blocker)
      values (ws, uid, sdate, sid, coalesce(y,''), coalesce(t,''), coalesce(b,''), coalesce(b,'') <> '')
      returning id into rec;
  else
    select jsonb_build_array(jsonb_build_object('at', now(), 'yesterday', yesterday, 'today', today, 'blockers', blockers))
      into hist from public.daily_scrum_updates where id = rec;
    update public.daily_scrum_updates
      set sprint_id = sid, yesterday = coalesce(y,''), today = coalesce(t,''), blockers = coalesce(b,''),
          has_blocker = coalesce(b,'') <> '',
          edit_history = coalesce(edit_history,'[]'::jsonb) || coalesce(hist,'[]'::jsonb)
      where id = rec;
  end if;
  delete from public.daily_scrum_tasks where scrum_update_id = rec;
  insert into public.daily_scrum_tasks (scrum_update_id, task_id, association)
    select rec, value::uuid, 'worked_on' from jsonb_array_elements_text(task_ids) as value
    on conflict do nothing;
  return rec;
end $$;

-- Complete sprint moving unfinished tasks explicitly
create or replace function public.complete_sprint(sp uuid, move_to uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_manager_in((select workspace_id from public.sprints where id = sp)) then
    raise exception 'not authorized';
  end if;
  update public.tasks set sprint_id = move_to where sprint_id = sp and status <> 'done';
  update public.sprints set status = 'completed' where id = sp;
end $$;

-- Log activity helper used by triggers on tasks
create or replace function public.log_task_activity() returns trigger
language plpgsql security definer set search_path = public as $$
declare diff jsonb; prev jsonb;
begin
  if tg_op = 'INSERT' then
    insert into public.task_activity (task_id, actor_id, action, new_values)
      values (new.id, coalesce(auth.uid(), new.creator_id), 'created', jsonb_build_object('title', new.title));
    return new;
  end if;
  if new.status is distinct from old.status then
    insert into public.task_activity (task_id, actor_id, action, previous_values, new_values)
      values (new.id, coalesce(auth.uid(), new.creator_id), 'status_changed',
              jsonb_build_object('status', old.status), jsonb_build_object('status', new.status));
  end if;
  if new.assignee_id is distinct from old.assignee_id then
    insert into public.task_activity (task_id, actor_id, action, previous_values, new_values)
      values (new.id, coalesce(auth.uid(), new.creator_id), 'assignee_changed',
              jsonb_build_object('assignee_id', old.assignee_id), jsonb_build_object('assignee_id', new.assignee_id));
  end if;
  if new.sprint_id is distinct from old.sprint_id then
    insert into public.task_activity (task_id, actor_id, action, previous_values, new_values)
      values (new.id, coalesce(auth.uid(), new.creator_id), 'sprint_changed',
              jsonb_build_object('sprint_id', old.sprint_id), jsonb_build_object('sprint_id', new.sprint_id));
  end if;
  return new;
end $$;
create trigger trg_task_activity after insert or update on public.tasks
  for each row execute function public.log_task_activity();

-- Notifications on assignment & blocking
create or replace function public.notify_task_events() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.assignee_id is distinct from old.assignee_id and new.assignee_id is not null then
    insert into public.notifications (user_id, workspace_id, type, title, link)
      values (new.assignee_id, new.workspace_id, 'task_assigned', 'You were assigned: ' || new.title, '/tasks/' || new.id);
  end if;
  if new.status = 'blocked' and old.status is distinct from 'blocked' then
    insert into public.notifications (user_id, workspace_id, type, title, link)
      values (new.creator_id, new.workspace_id, 'task_blocked', 'Task blocked: ' || new.title, '/tasks/' || new.id);
  end if;
  return new;
end $$;
create trigger trg_task_notify after update on public.tasks
  for each row execute function public.notify_task_events();

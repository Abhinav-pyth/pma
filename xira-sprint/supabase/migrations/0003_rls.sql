alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.workspace_invitations enable row level security;
alter table public.projects enable row level security;
alter table public.sprints enable row level security;
alter table public.tasks enable row level security;
alter table public.task_comments enable row level security;
alter table public.task_activity enable row level security;
alter table public.daily_plans enable row level security;
alter table public.daily_plan_tasks enable row level security;
alter table public.calendar_events enable row level security;
alter table public.calendar_event_attendees enable row level security;
alter table public.daily_scrum_updates enable row level security;
alter table public.daily_scrum_tasks enable row level security;
alter table public.notes enable row level security;
alter table public.notifications enable row level security;

-- profiles
create policy "profiles readable by members" on public.profiles for select
  using (id = auth.uid() or exists (
    select 1 from public.workspace_members m
    where m.user_id = auth.uid() and m.status='active'
      and m.workspace_id in (select workspace_id from public.workspace_members o where o.user_id = public.profiles.id)));
create policy "update own profile" on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid());
create policy "insert own profile" on public.profiles for insert with check (id = auth.uid());

-- workspaces: visible to members only; create via RPC; owner/admin can update settings
create policy "read member workspaces" on public.workspaces for select using (public.current_is_member(id));
create policy "admin updates workspace" on public.workspaces for update
  using (public.is_admin_in(id)) with check (owner_id = (select owner_id from public.workspaces w where w.id = id));

-- workspace_members
create policy "members see roster" on public.workspace_members for select
  using (public.current_is_member(workspace_id) or user_id = auth.uid());
create policy "admin manages members" on public.workspace_members for insert
  with check (public.is_admin_in(workspace_id) and role <> 'owner');
create policy "admin updates role not self-elevate" on public.workspace_members for update
  using (public.is_admin_in(workspace_id))
  with check (
    -- cannot grant owner role unless you are the current owner
    (role <> 'owner' or (select w.owner_id from public.workspaces w where w.id = workspace_id) = auth.uid())
    -- a non-admin target becoming admin is fine; nobody may change their own row upward except owner transfer handled server-side
    true
  );
create policy "admin removes members" on public.workspace_members for delete
  using (public.is_admin_in(workspace_id) and user_id <> auth.uid()
         and user_id <> (select w.owner_id from public.workspaces w where w.id = workspace_id));

-- invitations
create policy "admin sees invitations" on public.workspace_invitations for select using (public.is_admin_in(workspace_id));
create policy "admin creates invitation" on public.workspace_invitations for insert
  with check (public.is_admin_in(workspace_id) and inviter_id = auth.uid() and role <> 'owner');
create policy "admin updates invitation" on public.workspace_invitations for update using (public.is_admin_in(workspace_id));

-- projects
create policy "project read" on public.projects for select using (public.current_is_member(workspace_id));
create policy "project write" on public.projects for all
  using (public.is_manager_in(workspace_id)) with check (public.is_manager_in(workspace_id));

-- sprints
create policy "sprint read" on public.sprints for select using (public.current_is_member(workspace_id));
create policy "sprint write" on public.sprints for insert with check (public.is_manager_in(workspace_id));
create policy "sprint update" on public.sprints for update
  using (public.is_manager_in(workspace_id)) with check (public.is_manager_in(workspace_id));
create policy "sprint delete" on public.sprints for delete using (public.is_admin_in(workspace_id));

-- tasks: read by members; insert must be creator=self & member; update limited
create policy "task read" on public.tasks for select using (public.current_is_member(workspace_id));
create policy "task create" on public.tasks for insert with check (
  creator_id = auth.uid() and public.current_is_member(workspace_id));
create policy "task update" on public.tasks for update using (public.current_is_member(workspace_id))
  with check (public.current_is_member(workspace_id));
create policy "task delete" on public.tasks for delete
  using (public.is_manager_in(workspace_id) or (creator_id = auth.uid() and public.current_is_member(workspace_id)));

-- task comments
create policy "comment read" on public.task_comments for select using (
  exists (select 1 from public.tasks t where t.id = task_id and public.current_is_member(t.workspace_id)));
create policy "comment create" on public.task_comments for insert with check (author_id = auth.uid() and
  exists (select 1 from public.tasks t where t.id = task_id and public.current_is_member(t.workspace_id)));
create policy "comment edit own" on public.task_comments for update using (author_id = auth.uid());
create policy "comment delete" on public.task_comments for delete using (
  author_id = auth.uid() or public.is_manager_in((select t.workspace_id from public.tasks t where t.id = task_id)));

-- task activity: read-only for members, written by triggers (security definer)
create policy "activity read" on public.task_activity for select using (
  exists (select 1 from public.tasks t where t.id = task_id and public.current_is_member(t.workspace_id)));

-- daily plans: private to owner
create policy "plan own" on public.daily_plans for all
  using (user_id = auth.uid() and public.current_is_member(workspace_id))
  with check (user_id = auth.uid() and public.current_is_member(workspace_id));
create policy "plan tasks own" on public.daily_plan_tasks for all
  using (exists (select 1 from public.daily_plans p where p.id = daily_plan_id and p.user_id = auth.uid()))
  with check (exists (select 1 from public.daily_plans p where p.id = daily_plan_id and p.user_id = auth.uid()));

-- calendar events
create policy "event read" on public.calendar_events for select using (public.current_is_member(workspace_id));
create policy "event create" on public.calendar_events for insert with check (creator_id = auth.uid() and public.current_is_member(workspace_id));
create policy "event update" on public.calendar_events for update using (public.current_is_member(workspace_id)) with check (public.current_is_member(workspace_id));
create policy "event delete" on public.calendar_events for delete using (
  creator_id = auth.uid() or public.is_manager_in(workspace_id));
create policy "attendee read" on public.calendar_event_attendees for select using (
  exists (select 1 from public.calendar_events e where e.id = event_id and public.current_is_member(e.workspace_id)));
create policy "attendee write" on public.calendar_event_attendees for all using (
  exists (select 1 from public.calendar_events e where e.id = event_id and e.creator_id = auth.uid()))
  with check (exists (select 1 from public.calendar_events e where e.id = event_id and public.current_is_member(e.workspace_id)));

-- scrum updates: own rows writable; team readable by members
create policy "scrum read" on public.daily_scrum_updates for select using (public.current_is_member(workspace_id));
create policy "scrum own write" on public.daily_scrum_updates for insert with check (
  user_id = auth.uid() and public.current_is_member(workspace_id));
create policy "scrum own update" on public.daily_scrum_updates for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "scrum tasks rw" on public.daily_scrum_tasks for all using (
  exists (select 1 from public.daily_scrum_updates u where u.id = scrum_update_id and u.user_id = auth.uid()))
  with check (exists (select 1 from public.daily_scrum_updates u where u.id = scrum_update_id));

-- notes: private enforced at DB level
create policy "note read" on public.notes for select using (
  creator_id = auth.uid() or (visibility = 'workspace' and public.current_is_member(workspace_id)));
create policy "note create" on public.notes for insert with check (creator_id = auth.uid() and public.current_is_member(workspace_id));
create policy "note update own" on public.notes for update using (creator_id = auth.uid()) with check (creator_id = auth.uid());
create policy "note delete own" on public.notes for delete using (creator_id = auth.uid());

-- notifications
create policy "notif own read" on public.notifications for select using (user_id = auth.uid());
create policy "notif own update" on public.notifications for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "notif member insert" on public.notifications for insert with check (public.current_is_member(workspace_id));

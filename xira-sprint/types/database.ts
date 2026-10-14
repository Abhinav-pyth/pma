// Hand-written types mirroring supabase/migrations. Regenerate with `npm run db:types` after linking a project.
export type TaskStatus = "backlog" | "todo" | "in_progress" | "in_review" | "blocked" | "done";
export type TaskPriority = "low" | "medium" | "high" | "urgent";
export type TaskType = "feature" | "bug" | "improvement" | "chore";
export type SprintStatus = "planned" | "active" | "completed";
export type WorkspaceRole = "owner" | "admin" | "team_lead" | "member";
export type EventType = "personal" | "team_meeting" | "sprint_planning" | "daily_scrum" | "sprint_review" | "sprint_retro" | "task_deadline" | "custom_reminder";
export type NoteVisibility = "private" | "workspace";

export interface Profile { id: string; full_name: string; avatar_url: string | null; timezone: string; created_at: string; updated_at: string; }
export interface Workspace { id: string; name: string; slug: string; owner_id: string; settings: Record<string, unknown>; created_at: string; updated_at: string; }
export interface WorkspaceMember { id: string; workspace_id: string; user_id: string; role: WorkspaceRole; status: "active" | "deactivated"; joined_at: string; last_active_at: string | null; profile?: Profile; }
export interface WorkspaceInvitation { id: string; workspace_id: string; email: string; role: WorkspaceRole; status: "pending" | "accepted" | "expired" | "revoked"; inviter_id: string; token: string; expires_at: string; created_at: string; }
export interface Project { id: string; workspace_id: string; name: string; description: string | null; status: "active" | "archived"; created_at: string; updated_at: string; }
export interface Sprint { id: string; workspace_id: string; project_id: string | null; name: string; goal: string | null; description: string | null; start_date: string; end_date: string; status: SprintStatus; created_at: string; updated_at: string; }
export interface Task {
  id: string; workspace_id: string; project_id: string | null; sprint_id: string | null; parent_task_id: string | null;
  title: string; description: string | null; assignee_id: string | null; creator_id: string;
  status: TaskStatus; priority: TaskPriority; task_type: TaskType | null; labels: string[];
  start_date: string | null; due_date: string | null; estimated_hours: number | null; story_points: number | null;
  created_at: string; updated_at: string; completed_at: string | null;
  assignee?: Profile | null; sprint?: Sprint | null; project?: Project | null;
}
export interface TaskComment { id: string; task_id: string; author_id: string; content: string; created_at: string; updated_at: string; author?: Profile; }
export interface TaskActivity { id: string; task_id: string; actor_id: string; action: string; previous_values: Record<string, unknown> | null; new_values: Record<string, unknown> | null; created_at: string; actor?: Profile; }
export interface DailyPlan { id: string; workspace_id: string; user_id: string; plan_date: string; note: string | null; weekly_goal: string | null; created_at: string; updated_at: string; }
export interface DailyPlanTask { id: string; daily_plan_id: string; task_id: string; position: number; status: "planned" | "in_progress" | "completed" | "moved"; planned_start: string | null; planned_end: string | null; task?: Task; }
export interface CalendarEvent { id: string; workspace_id: string; creator_id: string; title: string; description: string | null; event_type: EventType; starts_at: string; ends_at: string; all_day: boolean; timezone: string; project_id: string | null; sprint_id: string | null; task_id: string | null; created_at: string; updated_at: string; attendees?: { user_id: string; status: string }[]; }
export interface DailyScrumUpdate { id: string; workspace_id: string; user_id: string; scrum_date: string; sprint_id: string | null; yesterday: string; today: string; blockers: string; has_blocker: boolean; submitted: boolean; edit_history: unknown[]; submitted_at: string; updated_at: string; profile?: Profile; tasks?: { task_id: string; association: string; task?: Task }[]; }
export interface Note { id: string; workspace_id: string; creator_id: string; project_id: string | null; sprint_id: string | null; task_id: string | null; calendar_event_id: string | null; title: string; content: string; visibility: NoteVisibility; pinned: boolean; archived: boolean; tags: string[]; created_at: string; updated_at: string; creator?: Profile; }
export interface AppNotification { id: string; user_id: string; workspace_id: string | null; type: string; title: string; body: string | null; link: string | null; read: boolean; created_at: string; }

export type Database = {
  public: {
    Tables: {
      profiles: { Row: Profile }; workspaces: { Row: Workspace }; workspace_members: { Row: WorkspaceMember };
      workspace_invitations: { Row: WorkspaceInvitation }; projects: { Row: Project }; sprints: { Row: Sprint };
      tasks: { Row: Task }; task_comments: { Row: TaskComment }; task_activity: { Row: TaskActivity };
      daily_plans: { Row: DailyPlan }; daily_plan_tasks: { Row: DailyPlanTask };
      calendar_events: { Row: CalendarEvent }; calendar_event_attendees: { Row: { event_id: string; user_id: string; status: string } };
      daily_scrum_updates: { Row: DailyScrumUpdate }; daily_scrum_tasks: { Row: { scrum_update_id: string; task_id: string; association: string } };
      notes: { Row: Note }; notifications: { Row: AppNotification };
    };
  };
};

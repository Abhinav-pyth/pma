import { createClient } from "@/lib/supabase/server";
import type { Task, TaskStatus, TaskPriority } from "@/types/database";

const TASK_SELECT = "*, assignee:profiles!tasks_assignee_id_fkey(*), sprint:sprints(id,name,status,end_date,start_date), project:projects(id,name)";

export async function listTasks(wsId: string, filters: { status?: TaskStatus; priority?: TaskPriority; assignee_id?: string; sprint_id?: string; project_id?: string; overdue_before?: string; due_on?: string; search?: string } = {}): Promise<Task[]> {
  const supabase = await createClient();
  let q = supabase.from("tasks").select(TASK_SELECT).eq("workspace_id", wsId).order("priority", { ascending: false }).order("due_date", { ascending: true, nullsFirst: false });
  if (filters.status) q = q.eq("status", filters.status);
  if (filters.priority) q = q.eq("priority", filters.priority);
  if (filters.assignee_id) q = q.eq("assignee_id", filters.assignee_id);
  if (filters.sprint_id) q = q.eq("sprint_id", filters.sprint_id);
  if (filters.project_id) q = q.eq("project_id", filters.project_id);
  if (filters.due_on) q = q.eq("due_date", filters.due_on);
  if (filters.overdue_before) q = q.lt("due_date", filters.overdue_before).neq("status", "done");
  if (filters.search) q = q.ilike("title", `%${filters.search}%`);
  const { data, error } = await q.limit(500);
  if (error) throw error;
  return (data ?? []) as unknown as Task[];
}

export async function getTask(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("tasks").select(`${TASK_SELECT}, task_activity(*, actor:profiles(*)), task_comments(*, author:profiles(*))`).eq("id", id).single();
  if (error) return null;
  return data as any;
}

export async function createTask(input: Partial<Task> & { workspace_id: string; creator_id: string; title: string }) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("tasks").insert(input).select().single();
  if (error) throw error;
  return data as Task;
}

export async function updateTask(id: string, patch: Partial<Task>) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("tasks").update(patch).eq("id", id).select().single();
  if (error) throw error;
  return data as Task;
}

export async function deleteTask(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) throw error;
}

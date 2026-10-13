import { createClient } from "@/lib/supabase/server";
import type { Sprint, Task } from "@/types/database";

export async function listSprints(wsId: string): Promise<Sprint[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("sprints").select("*").eq("workspace_id", wsId).order("start_date", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Sprint[];
}

export async function getSprint(id: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("sprints").select("*").eq("id", id).single();
  return data as Sprint | null;
}

export async function sprintTasks(sprintId: string): Promise<Task[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("tasks").select("*, assignee:profiles!tasks_assignee_id_fkey(*)").eq("sprint_id", sprintId);
  return (data ?? []) as unknown as Task[];
}

/** Completion percent from real task data. Empty sprint -> 0. */
export function sprintProgress(tasks: Task[]): { total: number; done: number; inProgress: number; blocked: number; open: number; pct: number; storyTotal: number; storyDone: number; remainingHours: number } {
  const total = tasks.length;
  const done = tasks.filter(t => t.status === "done").length;
  const inProgress = tasks.filter(t => t.status === "in_progress").length;
  const blocked = tasks.filter(t => t.status === "blocked").length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  const storyTotal = tasks.reduce((s, t) => s + (t.story_points ?? 0), 0);
  const storyDone = tasks.filter(t => t.status === "done").reduce((s, t) => s + (t.story_points ?? 0), 0);
  const remainingHours = tasks.filter(t => t.status !== "done").reduce((s, t) => s + (Number(t.estimated_hours) || 0), 0);
  return { total, done, inProgress, blocked, open: total - done, pct, storyTotal, storyDone, remainingHours };
}

export function detectOverlappingActive(sprints: Sprint[], candidate: { start_date: string; end_date: string; project_id?: string | null; id?: string }): Sprint[] {
  return sprints.filter(s =>
    s.id !== candidate.id && s.status === "active" &&
    (!candidate.project_id || s.project_id === candidate.project_id) &&
    s.start_date <= candidate.end_date && s.end_date >= candidate.start_date);
}

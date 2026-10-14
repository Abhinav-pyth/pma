import { createClient } from "@/lib/supabase/server";
import type { Sprint, Task } from "@/types/database";

// Pure calculation helpers live in lib/sprint-math.ts so client components can
// import them without pulling next/headers into the browser bundle.
export { sprintProgress, detectOverlappingActive } from "@/lib/sprint-math";

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
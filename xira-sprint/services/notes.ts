import { createClient } from "@/lib/supabase/server";
import type { Note } from "@/types/database";

export async function listNotes(wsId: string, opts: { search?: string; includeArchived?: boolean; taskId?: string; sprintId?: string } = {}): Promise<Note[]> {
  const supabase = await createClient();
  let q = supabase.from("notes").select("*, creator:profiles(*)").eq("workspace_id", wsId)
    .eq("archived", opts.includeArchived ? true : false).order("pinned", { ascending: false }).order("updated_at", { ascending: false });
  if (opts.search) q = q.or(`title.ilike.%${opts.search}%,content.ilike.%${opts.search}%`);
  if (opts.taskId) q = q.eq("task_id", opts.taskId);
  if (opts.sprintId) q = q.eq("sprint_id", opts.sprintId);
  const { data, error } = await q.limit(200);
  if (error) throw error;
  return (data ?? []) as unknown as Note[];
}

export async function saveNote(input: Partial<Note> & { workspace_id: string; creator_id: string; title: string }) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("notes").insert(input).select().single();
  if (error) throw error;
  return data as Note;
}

export async function updateNote(id: string, patch: Partial<Note>) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("notes").update(patch).eq("id", id).select().single();
  if (error) throw error;
  return data as Note;
}

export async function deleteNote(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("notes").delete().eq("id", id);
  if (error) throw error;
}

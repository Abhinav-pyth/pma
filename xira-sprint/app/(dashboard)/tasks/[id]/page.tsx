import { notFound } from "next/navigation";
import Link from "next/link";
import { ws } from "@/components/ws-context";
import { getTask } from "@/services/tasks";
import { listSprints } from "@/services/sprints";
import { getMembers } from "@/services/workspace";
import { createClient } from "@/lib/supabase/server";
import { TaskDetailClient } from "./detail-client";

export default async function TaskDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string>> }) {
  const { id } = await params;
  const sp = await searchParams;
  const c = await ws(sp);
  if (!c) return null;
  const task = await getTask(id);
  if (!task) notFound();
  const [sprints, members] = await Promise.all([listSprints(c.wsId), getMembers(c.wsId)]);
  const supabase = await createClient();
  const { data: projects } = await supabase.from("projects").select("id,name").eq("workspace_id", c.wsId);
  const { data: notes } = await supabase.from("notes").select("id,title,visibility,updated_at").eq("task_id", id).order("updated_at", { ascending: false });
  return <TaskDetailClient task={task} sprints={sprints} members={members.map(m => m.profile!).filter(Boolean)} projects={(projects ?? []) as any[]} notes={(notes ?? []) as any[]} userId={c.userId} wsId={c.wsId} role={c.role} />;
}

import { notFound } from "next/navigation";
import { ws } from "@/components/ws-context";
import { getSprint, sprintTasks } from "@/services/sprints";
import { listTasks } from "@/services/tasks";
import { getMembers } from "@/services/workspace";
import { createClient } from "@/lib/supabase/server";
import { SprintBoardClient } from "./board-client";

export default async function SprintDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string>> }) {
  const { id } = await params;
  const sp = await searchParams;
  const c = await ws(sp);
  if (!c) return null;
  const sprint = await getSprint(id);
  if (!sprint || sprint.workspace_id !== c.wsId) notFound();
  const [tasks, backlogRaw, members] = await Promise.all([sprintTasks(id), listTasks(c.wsId), getMembers(c.wsId)]);
  const backlog = (backlogRaw as any[]).filter(t => !t.sprint_id && t.status !== "done");
  const supabase = await createClient();
  const { data: activity } = await supabase.from("task_activity").select("created_at,new_values,action,task:tasks!inner(sprint_id)").eq("task.sprint_id", id).eq("action", "status_changed").order("created_at");
  const { data: otherSprints } = await supabase.from("sprints").select("id,name").eq("workspace_id", c.wsId).neq("id", id);
  return <SprintBoardClient sprint={sprint} tasks={tasks as any[]} backlog={backlog} members={members.map(m => m.profile!).filter(Boolean)} transitions={(activity ?? []) as any[]} otherSprints={(otherSprints ?? []) as any[]} role={c.role} today={c.today} />;
}

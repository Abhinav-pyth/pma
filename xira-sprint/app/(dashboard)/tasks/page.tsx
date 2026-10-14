import { ws } from "@/components/ws-context";
import { listTasks } from "@/services/tasks";
import { listSprints } from "@/services/sprints";
import { getMembers } from "@/services/workspace";
import { createClient } from "@/lib/supabase/server";
import { TasksClient } from "./tasks-client";

export default async function TasksPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const c = await ws(sp);
  if (!c) return null;
  const supabase = await createClient();
  const [tasks, sprints, members, { data: projects }] = await Promise.all([
    listTasks(c.wsId, { status: (sp.status as any) || undefined, priority: (sp.priority as any) || undefined, assignee_id: sp.assignee_id || undefined, sprint_id: sp.sprint_id || undefined, project_id: sp.project_id || undefined, overdue_before: sp.view === "overdue" ? c.today : undefined, due_on: sp.view === "today" ? c.today : undefined, search: sp.q }),
    listSprints(c.wsId), getMembers(c.wsId),
    supabase.from("projects").select("id,name").eq("workspace_id", c.wsId).order("name"),
  ]);
  let filtered = tasks as any[];
  if (sp.view === "week") {
    const { weekRange } = await import("@/lib/date");
    const { start, end } = weekRange(c.today);
    filtered = filtered.filter(t => t.due_date && t.due_date >= start && t.due_date <= end);
  }
  if (sp.view === "mine") filtered = filtered.filter(t => t.assignee_id === c.userId);
  return <TasksClient initialTasks={filtered} sprints={sprints} members={members.map(m => m.profile!).filter(Boolean)} projects={(projects ?? []) as any[]} userId={c.userId} wsId={c.wsId} role={c.role} today={c.today} />;
}

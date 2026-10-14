import { ws } from "@/components/ws-context";
import { listTasks } from "@/services/tasks";
import { listSprints, sprintProgress } from "@/services/sprints";
import { getPlanWithTasks } from "@/services/plans";
import { createClient } from "@/lib/supabase/server";
import { weekRange } from "@/lib/date";
import { DashboardClient } from "./dashboard-client";

export default async function DashboardPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const c = await ws(sp);
  if (!c) return null;
  const supabase = await createClient();
  const { start, end } = weekRange(c.today);
  const [allTasks, sprints, planData] = await Promise.all([
    listTasks(c.wsId), listSprints(c.wsId), getPlanWithTasks(c.wsId, c.userId, c.today),
  ]);
  const tasks = allTasks as any[];
  const mine = tasks.filter(t => t.assignee_id === c.userId);
  const activeSprint = sprints.find(s => s.status === "active") ?? null;
  const sprintTaskList = activeSprint ? tasks.filter(t => t.sprint_id === activeSprint.id) : [];
  const { data: scrumToday } = await supabase.from("daily_scrum_updates").select("id,user_id").eq("workspace_id", c.wsId).eq("user_id", c.userId).eq("scrum_date", c.today).maybeSingle();
  const { data: recentActivity } = await supabase.from("task_activity")
    .select("id,action,created_at,new_values,actor:profiles(full_name),task:tasks!inner(id,title,workspace_id)")
    .eq("task.workspace_id", c.wsId).order("created_at", { ascending: false }).limit(8);
  const { data: upcomingEvents } = await supabase.from("calendar_events").select("id,title,starts_at,event_type,all_day,task_id").eq("workspace_id", c.wsId).gte("ends_at", new Date().toISOString()).order("starts_at").limit(6);
  const stats = {
    dueToday: mine.filter(t => t.due_date === c.today && t.status !== "done").length,
    overdue: mine.filter(t => t.due_date && t.due_date < c.today && t.status !== "done").length,
    dueThisWeek: mine.filter(t => t.due_date && t.due_date >= start && t.due_date <= end && t.status !== "done").length,
    completedThisWeek: mine.filter(t => t.completed_at && String(t.completed_at).slice(0, 10) >= start && String(t.completed_at).slice(0, 10) <= end).length,
    blocked: tasks.filter(t => t.status === "blocked" && (t.assignee_id === c.userId || t.creator_id === c.userId)).length,
    pendingScrum: scrumToday ? 0 : 1,
  };
  const plannedIds = new Set((planData?.items ?? []).map((p: any) => p.task_id));
  const todaysFocus = [...(planData?.items ?? []), ...mine.filter(t => t.due_date === c.today && t.status !== "done" && !plannedIds.has(t.id))].slice(0, 12);
  return <DashboardClient today={c.today} userId={c.userId} wsId={c.wsId} stats={stats} todaysFocus={todaysFocus} activeSprint={activeSprint} sprintStats={sprintProgress(sprintTaskList)} sprintDaysLeft={activeSprint ? Math.max(0, Math.round((new Date(activeSprint.end_date).getTime() - new Date(c.today + "T00:00:00Z").getTime()) / 864e5)) : 0} activity={(recentActivity ?? []) as any[]} upcoming={(upcomingEvents ?? []) as any[]} submittedScrum={!!scrumToday} />;
}

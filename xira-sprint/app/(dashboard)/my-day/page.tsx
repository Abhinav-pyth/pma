import { ws } from "@/components/ws-context";
import { getPlanWithTasks } from "@/services/plans";
import { listTasks } from "@/services/tasks";
import { listSprints } from "@/services/sprints";
import { getMembers } from "@/services/workspace";
import { createClient } from "@/lib/supabase/server";
import { MyDayClient } from "./my-day-client";

export default async function MyDayPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const c = await ws(sp);
  if (!c) return null;
  const date = sp.date || c.today;
  const supabase = await createClient();
  const [planData, dueToday, overdue, sprintUpdates, sprints, members] = await Promise.all([
    getPlanWithTasks(c.wsId, c.userId, date),
    listTasks(c.wsId, { due_on: date }),
    listTasks(c.wsId, { overdue_before: date, assignee_id: c.userId }),
    supabase.from("daily_scrum_updates").select("*").eq("workspace_id", c.wsId).eq("user_id", c.userId).eq("scrum_date", date).single(),
    listSprints(c.wsId), getMembers(c.wsId),
  ]);
  const plan = planData?.plan ?? null;
  const planned = planData?.items ?? [];
  const { data: notes } = await supabase.from("notes").select("id,title,updated_at").eq("creator_id", c.userId).eq("workspace_id", c.wsId).like("updated_at", date + "%").limit(5);
  const backlog = (await listTasks(c.wsId, { assignee_id: c.userId })).filter(t => !planned.some((p: any) => p.task_id === t.id) && t.status !== "done");
  return <MyDayClient date={date} today={c.today} plan={plan} planned={planned as any[]} dueToday={dueToday as any[]} overdue={overdue as any[]} scrum={sprintUpdates.data as any} backlog={backlog as any} sprints={sprints} members={members.map(m => m.profile!).filter(Boolean)} notes={(notes ?? []) as any[]} userId={c.userId} wsId={c.wsId} />;
}

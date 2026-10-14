import { ws } from "@/components/ws-context";
import { listTasks } from "@/services/tasks";
import { createClient } from "@/lib/supabase/server";
import { weekRange } from "@/lib/date";
import { MyWeekClient } from "./my-week-client";

export default async function MyWeekPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const c = await ws(sp);
  if (!c) return null;
  const anchor = sp.week || c.today;
  const { days, start, end } = weekRange(anchor);
  const supabase = await createClient();
  const [{ data: plans }, myTasks] = await Promise.all([
    supabase.from("daily_plans").select("*, daily_plan_tasks(*, task:tasks(id,title,status,priority,due_date,sprint_id,sprints(name)))").eq("workspace_id", c.wsId).eq("user_id", c.userId).gte("plan_date", start).lte("plan_date", end),
    listTasks(c.wsId, { assignee_id: c.userId }),
  ]);
  const overdue = (myTasks as any[]).filter(t => t.due_date && t.due_date < c.today && t.status !== "done");
  return <MyWeekClient days={days} today={c.today} anchor={anchor} plans={(plans ?? []) as any[]} overdue={overdue} userId={c.userId} wsId={c.wsId} />;
}

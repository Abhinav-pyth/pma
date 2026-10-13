import { ws } from "@/components/ws-context";
import { listScrumUpdates, myScrumHistory } from "@/services/scrum";
import { getMembers } from "@/services/workspace";
import { listSprints } from "@/services/sprints";
import { createClient } from "@/lib/supabase/server";
import { weekRange } from "@/lib/date";
import { ScrumClient } from "./scrum-client";

export default async function ScrumPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const c = await ws(sp);
  if (!c) return null;
  const date = sp.date || c.today;
  const { start, end } = weekRange(c.today);
  const [updates, members, sprints, history] = await Promise.all([
    listScrumUpdates(c.wsId, date), getMembers(c.wsId), listSprints(c.wsId),
    myScrumHistory(c.wsId, c.userId, start, end),
  ]);
  const supabase = await createClient();
  const { data: myTasks } = await supabase.from("tasks").select("id,title,status").eq("workspace_id", c.wsId).eq("assignee_id", c.userId).neq("status", "done").limit(50);
  const activeSprint = sprints.find(s => s.status === "active");
  return <ScrumClient date={date} today={c.today} updates={updates} members={members.map(m => m.profile!).filter(Boolean)} mine={updates.find(u => u.user_id === c.userId) ?? null} sprints={sprints} myTasks={(myTasks ?? []) as any[]} weekHistory={history} activeSprint={activeSprint ?? null} userId={c.userId} wsId={c.wsId} role={c.role} canReview={["owner","admin","team_lead"].includes(c.role)} />;
}

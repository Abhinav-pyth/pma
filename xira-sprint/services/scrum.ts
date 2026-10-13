import { createClient } from "@/lib/supabase/server";
import type { DailyScrumUpdate } from "@/types/database";

export async function listScrumUpdates(wsId: string, date: string): Promise<DailyScrumUpdate[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("daily_scrum_updates")
    .select("*, profile:profiles(*), daily_scrum_tasks(*, task:tasks(id,title,status,priority))")
    .eq("workspace_id", wsId).eq("scrum_date", date).order("submitted_at", { ascending: false });
  return (data ?? []) as unknown as DailyScrumUpdate[];
}

export async function myScrumHistory(wsId: string, userId: string, from: string, to: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("daily_scrum_updates")
    .select("*, daily_scrum_tasks(*, task:tasks(id,title,status))")
    .eq("workspace_id", wsId).eq("user_id", userId).gte("scrum_date", from).lte("scrum_date", to)
    .order("scrum_date", { ascending: false });
  return (data ?? []) as unknown as DailyScrumUpdate[];
}

export async function submitScrum(args: { wsId: string; date: string; sprintId?: string | null; yesterday: string; today: string; blockers: string; taskIds: string[] }) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("upsert_scrum_update", {
    ws: args.wsId, sdate: args.date, sid: args.sprintId ?? null,
    y: args.yesterday, t: args.today, b: args.blockers, task_ids: JSON.parse(JSON.stringify(args.taskIds)),
  });
  if (error) throw error;
  return data as string;
}

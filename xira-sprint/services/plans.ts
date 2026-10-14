import { createClient } from "@/lib/supabase/server";
import type { DailyPlan, DailyPlanTask } from "@/types/database";

export async function getOrCreatePlan(wsId: string, userId: string, date: string): Promise<DailyPlan> {
  const supabase = await createClient();
  const { data: existing } = await supabase.from("daily_plans").select("*")
    .eq("workspace_id", wsId).eq("user_id", userId).eq("plan_date", date).single();
  if (existing) return existing as DailyPlan;
  const { data, error } = await supabase.from("daily_plans").insert({ workspace_id: wsId, user_id: userId, plan_date: date }).select().single();
  if (error) throw error;
  return data as DailyPlan;
}

export async function getPlanWithTasks(wsId: string, userId: string, date: string) {
  const supabase = await createClient();
  const { data: plan } = await supabase.from("daily_plans").select("*, daily_plan_tasks(*, task:tasks(*, assignee:profiles!tasks_assignee_id_fkey(*), sprint:sprints(id,name))))")
    .eq("workspace_id", wsId).eq("user_id", userId).eq("plan_date", date).single();
  if (!plan) return null;
  const items = ((plan as any).daily_plan_tasks ?? []).sort((a: DailyPlanTask, b: DailyPlanTask) => a.position - b.position);
  return { plan: plan as unknown as DailyPlan & { daily_plan_tasks: DailyPlanTask[] }, items };
}

/** Move a planned task to another date WITHOUT changing the task's own due_date. */
export async function movePlanTask(planTaskId: string, toWs: string, toUser: string, toDate: string, position = 0) {
  const supabase = await createClient();
  const { data: pt } = await supabase.from("daily_plan_tasks").select("task_id, daily_plan:daily_plans(user_id,workspace_id)").eq("id", planTaskId).single();
  if (!pt) throw new Error("Plan entry not found");
  await supabase.from("daily_plan_tasks").delete().eq("id", planTaskId);
  const target = await getOrCreatePlan(toWs, toUser, toDate);
  const { error } = await supabase.from("daily_plan_tasks").insert({ daily_plan_id: target.id, task_id: pt.task_id, position });
  if (error) throw error;
}

export async function addTaskToPlan(wsId: string, userId: string, date: string, taskId: string) {
  const plan = await getOrCreatePlan(wsId, userId, date);
  const supabase = await createClient();
  const { count } = await supabase.from("daily_plan_tasks").select("*", { count: "exact", head: true }).eq("daily_plan_id", plan.id);
  const { error } = await supabase.from("daily_plan_tasks").insert({ daily_plan_id: plan.id, task_id: taskId, position: (count ?? 0) + 1 });
  if (error) throw error;
}

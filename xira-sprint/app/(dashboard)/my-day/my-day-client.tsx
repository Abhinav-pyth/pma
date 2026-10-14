"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format, parseISO, addDays, subDays } from "date-fns";
import { ChevronLeft, ChevronRight, Plus, CheckCircle2, Circle, ArrowRight, StickyNote, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/dialog";
import { StatusBadge, PriorityBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/misc";
import { TaskForm } from "@/components/tasks/task-form";
import { createClient } from "@/lib/supabase/client";

export function MyDayClient({ date, today, plan, planned, dueToday, overdue, scrum, backlog, sprints, members, notes, userId, wsId }: any) {
  const router = useRouter();
  const [showNew, setShowNew] = useState(false);
  const [busy, setBusy] = useState(false);

  async function addPlanned(taskId: string) {
    setBusy(true);
    const supabase = createClient();
    let planId = plan?.id;
    if (!planId) {
      const { data } = await supabase.from("daily_plans").insert({ workspace_id: wsId, user_id: userId, plan_date: date }).select("id").single();
      planId = data!.id;
    }
    const { error } = await supabase.from("daily_plan_tasks").insert({ daily_plan_id: planId, task_id: taskId, position: planned.length + 1 });
    setBusy(false);
    if (error) return toast.error(error.message.includes("duplicate") ? "Already in your plan" : error.message);
    toast.success("Added to your day"); router.refresh();
  }
  async function complete(planTaskId: string, done: boolean) {
    const supabase = createClient();
    const { error } = await supabase.from("daily_plan_tasks").update({ status: done ? "completed" : "planned" }).eq("id", planTaskId);
    if (!error) await supabase.from("tasks").update({ status: done ? "done" : "todo" }).eq("id", planned.find((p: any) => p.id === planTaskId)?.task_id);
    router.refresh();
  }
  async function moveTomorrow(planTaskId: string) {
    const target = format(addDays(parseISO(date), 1), "yyyy-MM-dd");
    const supabase = createClient();
    const pt = planned.find((p: any) => p.id === planTaskId);
    await supabase.from("daily_plan_tasks").delete().eq("id", planTaskId);
    const { data: tp } = await supabase.from("daily_plans").upsert({ workspace_id: wsId, user_id: userId, plan_date: target }, { onConflict: "workspace_id,user_id,plan_date" }).select("id").single();
    const { error } = await supabase.from("daily_plan_tasks").insert({ daily_plan_id: tp!.id, task_id: pt.task_id, position: 99 });
    if (error) return toast.error("Move failed");
    toast.success(`Moved to ${target} — original due date unchanged`); router.refresh();
  }
  async function reorder(idx: number, dir: -1 | 1) {
    const arr = [...planned];
    const j = idx + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[idx], arr[j]] = [arr[j], arr[idx]];
    const supabase = createClient();
    await Promise.all(arr.map((p: any, i: number) => supabase.from("daily_plan_tasks").update({ position: i + 1 }).eq("id", p.id)));
    router.refresh();
  }

  const d = parseISO(date);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button aria-label="Previous day" onClick={() => router.push(`/my-day?date=${format(subDays(d, 1), "yyyy-MM-dd")}`)} className="rounded-md border p-1.5 hover:bg-slate-50 dark:hover:bg-slate-800"><ChevronLeft className="h-4 w-4" /></button>
        <h1 className="text-lg font-semibold">{format(d, "EEEE, MMMM d, yyyy")}</h1>
        <button aria-label="Next day" onClick={() => router.push(`/my-day?date=${format(addDays(d, 1), "yyyy-MM-dd")}`)} className="rounded-md border p-1.5 hover:bg-slate-50 dark:hover:bg-slate-800"><ChevronRight className="h-4 w-4" /></button>
        {date !== today && <Link href="/my-day" className="text-xs text-indigo-600 hover:underline">Jump to today</Link>}
        <Button size="sm" className="ml-auto" onClick={() => setShowNew(true)}><Plus className="h-4 w-4" />Quick task</Button>
      </div>

      {/* Scrum banner */}
      {date === today && (
        <div className={`flex items-center justify-between rounded-lg border p-3 text-sm ${scrum ? "border-green-200 bg-green-50 text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-200" : "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200"}`}>
          <span>Daily scrum update for {date}: <b>{scrum ? "submitted ✓" : "pending"}</b>{scrum?.has_blocker && " · you reported a blocker"}</span>
          <Link href="/scrum" className="font-medium underline">{scrum ? "Edit update" : "Submit today's update"}</Link>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <section className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="mb-2 text-sm font-semibold">My plan for this day ({planned.length})</h2>
            {planned.length === 0 ? <EmptyState title="Nothing planned yet" description="Add tasks below or quick-create one." /> : (
              <ul className="space-y-2">
                {planned.map((p: any, i: number) => (
                  <li key={p.id} className={`flex items-center gap-2 rounded-md border border-slate-100 p-2 dark:border-slate-800 ${p.status === "completed" ? "opacity-60" : ""}`}>
                    <button aria-label="Move up" onClick={() => reorder(i, -1)} className="text-slate-300 hover:text-slate-500">↑</button>
                    <button aria-label="Move down" onClick={() => reorder(i, 1)} className="text-slate-300 hover:text-slate-500">↓</button>
                    <button aria-label={p.status === "completed" ? "Mark incomplete" : "Mark completed"} onClick={() => complete(p.id, p.status !== "completed")} className="shrink-0">
                      {p.status === "completed" ? <CheckCircle2 className="h-5 w-5 text-green-600" /> : <Circle className="h-5 w-5 text-slate-400" />}
                    </button>
                    <div className="min-w-0 flex-1">
                      <Link href={`/tasks/${p.task?.id}`} className={`block truncate text-sm font-medium hover:underline ${p.status === "completed" ? "line-through" : ""}`}>{p.task?.title}</Link>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500">{p.task && <StatusBadge status={p.task.status} />}{p.task?.sprint?.name && <span>· {p.task.sprint.name}</span>}{p.task?.due_date && <span>· due {p.task.due_date}</span>}</div>
                    </div>
                    <button title="Move to tomorrow (does not change the task's due date)" onClick={() => moveTomorrow(p.id)} className="flex items-center gap-1 rounded px-1.5 py-1 text-[11px] text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><ArrowRight className="h-3.5 w-3.5" />tomorrow</button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="mb-2 text-sm font-semibold">Due today ({dueToday.length})</h2>
            {dueToday.length === 0 ? <p className="text-xs text-slate-400">No tasks with a deadline of {date}.</p> : dueToday.map((t: any) => (
              <div key={t.id} className="flex items-center gap-2 border-b border-slate-50 py-1.5 last:border-0 dark:border-slate-800">
                <Link href={`/tasks/${t.id}`} className="flex-1 truncate text-sm hover:underline">{t.title}</Link>
                <PriorityBadge priority={t.priority} />
                <Button size="sm" variant="outline" disabled={busy} onClick={() => addPlanned(t.id)}>+ Plan</Button>
              </div>
            ))}
          </section>

          {overdue.length > 0 && (
            <section className="rounded-lg border border-red-200 bg-red-50/50 p-4 dark:border-red-900">
              <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-red-700 dark:text-red-300"><AlertTriangle className="h-4 w-4" />Overdue ({overdue.length})</h2>
              {overdue.map((t: any) => (
                <div key={t.id} className="flex items-center gap-2 py-1 text-sm">
                  <Link href={`/tasks/${t.id}`} className="flex-1 truncate hover:underline">{t.title}</Link>
                  <span className="text-xs text-red-600">was due {t.due_date}</span>
                  <Button size="sm" variant="outline" disabled={busy} onClick={() => addPlanned(t.id)}>+ Plan</Button>
                </div>
              ))}
            </section>
          )}
        </div>

        <div className="space-y-4">
          <section className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="mb-2 text-sm font-semibold">Add from my open tasks</h2>
            {backlog.length === 0 ? <p className="text-xs text-slate-400">No unassigned-to-plan open tasks.</p> : (
              <ul className="max-h-64 space-y-1 overflow-y-auto">
                {backlog.slice(0, 12).map((t: any) => (
                  <li key={t.id} className="flex items-center gap-2 text-sm">
                    <span className="min-w-0 flex-1 truncate">{t.title}</span>
                    <Button size="sm" variant="ghost" disabled={busy} onClick={() => addPlanned(t.id)} aria-label={`Add ${t.title} to plan`}><Plus className="h-3.5 w-3.5" /></Button>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold"><StickyNote className="h-4 w-4" />Notes touched today</h2>
            {notes.length === 0 ? <p className="text-xs text-slate-400">None.</p> : notes.map((n: any) => <Link key={n.id} href={`/notes?open=${n.id}`} className="block truncate py-1 text-sm hover:underline">{n.title}</Link>)}
            <Link href="/notes?new=1" className="mt-2 block text-xs text-indigo-600 hover:underline">+ New note</Link>
          </section>
        </div>
      </div>
      <Modal open={showNew} onClose={() => setShowNew(false)} title="Quick create task">
        <TaskForm wsId={wsId} userId={userId} members={members} sprints={sprints} projects={[]} onDone={() => setShowNew(false)} />
      </Modal>
    </div>
  );
}

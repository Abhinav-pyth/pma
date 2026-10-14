"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronLeft, AlertTriangle } from "lucide-react";
import { Modal, ConfirmDialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress, EmptyState } from "@/components/ui/misc";
import { KanbanBoard } from "@/components/tasks/kanban";
import { sprintProgress } from "@/lib/sprint-math";
import { canManageSprints } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/client";
import { differenceInCalendarDays, parseISO, format } from "date-fns";

export function SprintBoardClient({ sprint, tasks, backlog, members, transitions, otherSprints, role, today }: any) {
  const router = useRouter();
  const [showBacklog, setShowBacklog] = useState(false);
  const [confirmComplete, setConfirmComplete] = useState(false);
  const st = sprintProgress(tasks);
  const remaining = Math.max(0, differenceInCalendarDays(parseISO(sprint.end_date), parseISO(today)));

  // real burndown from task_activity status transitions (no fabricated history)
  const burndown = useMemo(() => {
    const total = tasks.length;
    if (total === 0 || transitions.length === 0) return null;
    const days: { day: string; remaining: number }[] = [];
    const start = parseISO(sprint.start_date), end = parseISO(sprint.end_date);
    const span = Math.min(differenceInCalendarDays(end, start), 31);
    let doneSoFar = 0;
    const doneByDay = new Map<string, number>();
    for (const tr of transitions) {
      if (tr.new_values?.status === "done") {
        const d = format(new Date(tr.created_at), "yyyy-MM-dd");
        doneByDay.set(d, (doneByDay.get(d) ?? 0) + 1);
      }
    }
    for (let i = 0; i <= span; i++) {
      const d = format(new Date(addI(start, i)), "yyyy-MM-dd");
      doneSoFar += doneByDay.get(d) ?? 0;
      days.push({ day: d.slice(5), remaining: total - doneSoFar });
    }
    return days;
  }, [tasks, transitions, sprint]);

  function addI(d: Date, i: number) { const x = new Date(d); x.setDate(x.getDate() + i); return x; }

  const byMember = members.map((m: any) => {
    const mine = tasks.filter((t: any) => t.assignee_id === m.id);
    return { name: m.full_name, total: mine.length, done: mine.filter((t: any) => t.status === "done").length };
  }).filter((r: any) => r.total > 0);

  async function addToSprint(taskId: string) {
    const supabase = createClient();
    const { error } = await supabase.from("tasks").update({ sprint_id: sprint.id }).eq("id", taskId);
    if (error) return toast.error(error.message);
    toast.success("Added to sprint"); setShowBacklog(false); router.refresh();
  }
  async function completeMove(mode: string) {
    const supabase = createClient();
    const target = mode === "backlog" ? null : mode;
    const { error } = await supabase.rpc("complete_sprint", { sp: sprint.id, move_to: target });
    if (error) return toast.error(error.message);
    toast.success("Sprint completed — unfinished work moved explicitly"); router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Link href="/sprints" className="text-xs text-indigo-600 hover:underline"><ChevronLeft className="mr-0.5 inline h-3 w-3" />Sprints</Link>
        <h1 className="text-lg font-semibold">{sprint.name}</h1>
        <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${sprint.status === "active" ? "border-blue-200 bg-blue-50 text-blue-700" : sprint.status === "completed" ? "border-green-200 bg-green-50 text-green-700" : "border-slate-200 bg-slate-100 text-slate-600"}`}>{sprint.status}</span>
        <div className="ml-auto flex gap-2">
          {canManageSprints(role) && sprint.status !== "completed" && <Button size="sm" variant="outline" onClick={() => setShowBacklog(true)}>+ Add tasks</Button>}
          {canManageSprints(role) && sprint.status === "active" && <Button size="sm" onClick={() => setConfirmComplete(true)}>Complete sprint</Button>}
        </div>
      </div>
      {sprint.goal && <p className="text-sm text-slate-600 dark:text-slate-300"><b>Goal:</b> {sprint.goal}</p>}
      <p className="text-xs text-slate-500">{sprint.start_date} → {sprint.end_date}{sprint.status === "active" && ` · ${remaining} day${remaining === 1 ? "" : "s"} remaining`}</p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[["Total", st.total], ["Done", st.done], ["In progress", st.inProgress], ["Blocked", st.blocked], ["Story pts", `${st.storyDone}/${st.storyTotal}`], ["Remaining hrs", st.remainingHours]].map(([k, v]) => (
          <div key={k as string} className="rounded-lg border border-slate-200 bg-white p-3 text-center dark:border-slate-800 dark:bg-slate-900">
            <p className="text-lg font-bold">{v as string}</p><p className="text-[11px] uppercase tracking-wide text-slate-400">{k as string}</p>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
        <span className="text-xs font-medium text-slate-500">Completion</span><Progress value={st.pct} className="flex-1" /><span className="text-sm font-semibold">{st.pct}%</span>
      </div>

      {burndown ? (
        <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-2 text-sm font-semibold">Burndown (from real status history)</h2>
          <svg viewBox={`0 0 ${burndown.length * 24} 100`} className="h-24 w-full" role="img" aria-label="Sprint burndown chart">
            <polyline fill="none" stroke="#4f46e5" strokeWidth="2" points={burndown.map((p, i) => `${i * 24 + 12},${100 - (p.remaining / Math.max(1, tasks.length)) * 90}`).join(" ")} />
          </svg>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-slate-300 p-4 text-center text-xs text-slate-400 dark:border-slate-700">No historical status-change data yet — the burndown chart will appear once tasks are completed during this sprint.</div>
      )}

      {byMember.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-2 text-sm font-semibold">Team breakdown</h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {byMember.map((r: any) => <div key={r.name} className="flex items-center gap-2 text-sm"><span className="w-28 truncate">{r.name}</span><Progress value={r.total ? (r.done / r.total) * 100 : 0} className="flex-1" /><span className="text-xs text-slate-500">{r.done}/{r.total}</span></div>)}
          </div>
        </div>
      )}

      <KanbanBoard tasks={tasks} />

      <Modal open={showBacklog} onClose={() => setShowBacklog(false)} title="Add backlog tasks to sprint">
        {backlog.length === 0 ? <EmptyState title="Backlog is empty" description="Every open task already belongs to a sprint." /> : (
          <ul className="max-h-80 space-y-1 overflow-y-auto">
            {backlog.map((t: any) => (
              <li key={t.id} className="flex items-center gap-2 text-sm">
                <Link className="min-w-0 flex-1 truncate hover:underline" href={`/tasks/${t.id}`}>{t.title}</Link>
                <Button size="sm" variant="outline" onClick={() => addToSprint(t.id)}>Add</Button>
              </li>
            ))}
          </ul>
        )}
      </Modal>
      <ConfirmDialog open={confirmComplete} onClose={() => setConfirmComplete(false)} title="Complete sprint"
        message={`${st.open} unfinished task${st.open === 1 ? "" : "s"} remain. Choose where they go — nothing is deleted silently.`}
        onConfirm={() => {}} />
      {confirmComplete && (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white p-4 shadow-lg dark:border-slate-800 dark:bg-slate-900">
          <p className="mb-2 flex items-center gap-1.5 text-sm font-medium"><AlertTriangle className="h-4 w-4 text-amber-500" />Move {st.open} unfinished task(s) to…</p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => { setConfirmComplete(false); completeMove("backlog"); }}>Backlog</Button>
            {otherSprints.map((s: any) => <Button key={s.id} size="sm" variant="outline" onClick={() => { setConfirmComplete(false); completeMove(s.id); }}>{s.name}</Button>)}
            <Button size="sm" variant="ghost" onClick={() => setConfirmComplete(false)}>Cancel</Button>
          </div>
        </div>
      )}
    </div>
  );
}

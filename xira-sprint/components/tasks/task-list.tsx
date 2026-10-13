"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, Circle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { StatusBadge, PriorityBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/misc";
import type { Task } from "@/types/database";

export function TaskList({ tasks }: { tasks: Task[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function toggleDone(t: Task) {
    setBusy(t.id);
    // optimistic
    const supabase = createClient();
    const next = t.status === "done" ? "todo" : "done";
    const { error } = await supabase.from("tasks").update({ status: next }).eq("id", t.id);
    setBusy(null);
    if (error) { toast.error("Could not update task — changes rolled back"); return; }
    toast.success(next === "done" ? "Task completed 🎉" : "Task reopened");
    router.refresh();
  }

  if (tasks.length === 0) return <EmptyState title="No tasks found" description="Create a task with the + button in the header, or adjust your filters." />;
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <table className="w-full text-sm">
        <thead><tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400 dark:border-slate-800">
          <th className="p-3 w-8"></th><th className="p-3">Task</th><th className="p-3">Status</th><th className="p-3">Priority</th><th className="p-3">Assignee</th><th className="p-3 hidden md:table-cell">Sprint</th><th className="p-3">Due</th>
        </tr></thead>
        <tbody>
          {tasks.map(t => (
            <tr key={t.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50">
              <td className="p-3">
                <button aria-label={t.status === "done" ? "Reopen task" : "Complete task"} disabled={busy === t.id} onClick={() => toggleDone(t)} className="text-slate-400 hover:text-green-600 disabled:opacity-40">
                  {t.status === "done" ? <CheckCircle2 className="h-5 w-5 text-green-600" /> : <Circle className="h-5 w-5" />}
                </button>
              </td>
              <td className="max-w-[280px] p-3"><Link href={`/tasks/${t.id}`} className="font-medium text-indigo-700 hover:underline dark:text-indigo-300">{t.title}</Link>{t.labels?.length > 0 && <span className="ml-2 hidden text-xs text-slate-400 sm:inline">{t.labels.join(" · ")}</span>}</td>
              <td className="p-3"><StatusBadge status={t.status} /></td>
              <td className="p-3"><PriorityBadge priority={t.priority} /></td>
              <td className="p-3 text-xs text-slate-600 dark:text-slate-300">{t.assignee?.full_name ?? <span className="text-slate-400">Unassigned</span>}</td>
              <td className="hidden p-3 text-xs md:table-cell">{t.sprint ? <Link className="hover:underline" href={`/sprints/${t.sprint_id}`}>{t.sprint.name}</Link> : <span className="text-slate-400">Backlog</span>}</td>
              <td className={`p-3 text-xs ${t.due_date && t.status !== "done" && t.due_date < new Date().toISOString().slice(0, 10) ? "font-medium text-red-600" : ""}`}>{t.due_date ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

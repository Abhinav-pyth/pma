"use client";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Plus, List, Kanban as KanbanIcon, Copy, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Modal } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { TaskList } from "@/components/tasks/task-list";
import { KanbanBoard } from "@/components/tasks/kanban";
import { TaskForm } from "@/components/tasks/task-form";
import { ConfirmDialog } from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";
import type { Task, Profile } from "@/types/database";

const VIEWS = [["all","All"],["mine","My Tasks"],["today","Due Today"],["week","This Week"],["overdue","Overdue"]];

export function TasksClient({ initialTasks, sprints, members, projects, userId, wsId, role, today }: any) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [view, setView] = useState(searchParams.get("view") || "all");
  const [mode, setMode] = useState<"list" | "board">((searchParams.get("mode") as any) || "list");
  const [showNew, setShowNew] = useState(searchParams.get("new") === "1");
  const [dupConfirm, setDupConfirm] = useState<Task | null>(null);
  const [delConfirm, setDelConfirm] = useState<Task | null>(null);
  const [filters, setFilters] = useState({ status: searchParams.get("status") || "", priority: searchParams.get("priority") || "", assignee_id: searchParams.get("assignee_id") || "", sprint_id: searchParams.get("sprint_id") || "" });

  // preserve view/filters in URL so state survives navigation
  useEffect(() => {
    const p = new URLSearchParams(searchParams.toString());
    if (view !== "all") p.set("view", view); else p.delete("view");
    p.set("mode", mode);
    for (const [k, v] of Object.entries(filters)) { if (v) p.set(k, v as string); else p.delete(k as string); }
    p.delete("new");
    router.replace(`${pathname}?${p.toString()}`, { scroll: false });
  }, [view, mode, filters]); // eslint-disable-line

  const tasks = useMemo(() => initialTasks.filter((t: Task) =>
    (!filters.status || t.status === filters.status) &&
    (!filters.priority || t.priority === filters.priority) &&
    (!filters.assignee_id || t.assignee_id === filters.assignee_id) &&
    (!filters.sprint_id || t.sprint_id === filters.sprint_id)), [initialTasks, filters]);

  async function duplicate(t: Task) {
    const supabase = createClient();
    const { id, created_at, updated_at, completed_at, ...rest } = t as any;
    const { error } = await supabase.from("tasks").insert({ ...rest, title: `${t.title} (copy)`, workspace_id: wsId, creator_id: userId, status: "todo" });
    if (error) return toast.error(error.message);
    toast.success("Task duplicated"); router.refresh();
  }
  async function remove(t: Task) {
    const supabase = createClient();
    const { error } = await supabase.from("tasks").delete().eq("id", t.id);
    if (error) return toast.error("Delete failed — you may not have permission");
    toast.success("Task deleted"); router.refresh();
  }

  const sel = "h-8 rounded-md border border-slate-300 bg-white px-2 text-sm dark:border-slate-700 dark:bg-slate-900";
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="mr-auto text-lg font-semibold">Tasks</h1>
        <Button size="sm" onClick={() => setShowNew(true)}><Plus className="h-4 w-4" />New task</Button>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <div className="flex overflow-hidden rounded-md border border-slate-300 dark:border-slate-700">
          {VIEWS.map(([k, l]) => <button key={k} onClick={() => setView(k)} className={`px-3 py-1.5 text-xs ${view === k ? "bg-indigo-600 text-white" : "bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800"}`}>{l}</button>)}
        </div>
        <select aria-label="Filter by status" className={sel} value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}><option value="">Status: all</option>{["backlog","todo","in_progress","in_review","blocked","done"].map(s => <option key={s} value={s}>{s.replace("_"," ")}</option>)}</select>
        <select aria-label="Filter by priority" className={sel} value={filters.priority} onChange={e => setFilters(f => ({ ...f, priority: e.target.value }))}><option value="">Priority: all</option>{["low","medium","high","urgent"].map(s => <option key={s} value={s}>{s}</option>)}</select>
        <select aria-label="Filter by assignee" className={sel} value={filters.assignee_id} onChange={e => setFilters(f => ({ ...f, assignee_id: e.target.value }))}><option value="">Assignee: all</option>{members.map((m: Profile) => <option key={m.id} value={m.id}>{m.full_name}</option>)}</select>
        <select aria-label="Filter by sprint" className={sel} value={filters.sprint_id} onChange={e => setFilters(f => ({ ...f, sprint_id: e.target.value }))}><option value="">Sprint: all</option>{sprints.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
        <div className="ml-auto flex overflow-hidden rounded-md border border-slate-300 dark:border-slate-700">
          <button aria-label="List view" onClick={() => setMode("list")} className={`p-1.5 ${mode === "list" ? "bg-indigo-600 text-white" : ""}`}><List className="h-4 w-4" /></button>
          <button aria-label="Kanban board view" onClick={() => setMode("board")} className={`p-1.5 ${mode === "board" ? "bg-indigo-600 text-white" : ""}`}><KanbanIcon className="h-4 w-4" /></button>
        </div>
      </div>
      {mode === "list" ? <TaskList tasks={tasks} /> : <KanbanBoard tasks={tasks} />}
      <Modal open={showNew} onClose={() => setShowNew(false)} title="New task"><TaskForm wsId={wsId} userId={userId} members={members} sprints={sprints} projects={projects} onDone={() => setShowNew(false)} /></Modal>
      <ConfirmDialog open={!!dupConfirm} onClose={() => setDupConfirm(null)} title="Duplicate task" message={`Create a copy of "${dupConfirm?.title}"?`} onConfirm={() => dupConfirm && duplicate(dupConfirm)} />
      <ConfirmDialog open={!!delConfirm} onClose={() => setDelConfirm(null)} danger title="Delete task" message={`Permanently delete "${delConfirm?.title}"? This cannot be undone.`} onConfirm={() => delConfirm && remove(delConfirm)} />
    </div>
  );
}

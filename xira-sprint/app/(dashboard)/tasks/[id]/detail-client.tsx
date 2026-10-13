"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Trash2, MessageSquarePlus, StickyNote } from "lucide-react";
import { Modal, ConfirmDialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { StatusBadge, PriorityBadge } from "@/components/ui/badge";
import { TaskForm } from "@/components/tasks/task-form";
import { createClient } from "@/lib/supabase/client";
import type { Task } from "@/types/database";

const ACTION_LABEL: Record<string, string> = { created: "created this task", status_changed: "changed status", assignee_changed: "reassigned the task", sprint_changed: "moved the sprint" };

export function TaskDetailClient({ task, sprints, members, projects, notes, userId, wsId, role }: any) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [comment, setComment] = useState("");
  const activity = (task.task_activity ?? []).slice().reverse();

  async function postComment() {
    if (!comment.trim()) return;
    const supabase = createClient();
    const { error } = await supabase.from("task_comments").insert({ task_id: task.id, author_id: userId, content: comment.trim() });
    if (error) return toast.error(error.message);
    setComment(""); toast.success("Comment added"); router.refresh();
  }
  async function del() {
    const supabase = createClient();
    const { error } = await supabase.from("tasks").delete().eq("id", task.id);
    if (error) return toast.error("Delete failed");
    toast.success("Task deleted");
    router.push("/tasks");
  }
  async function setStatus(s: string) {
    const supabase = createClient();
    const { error } = await supabase.from("tasks").update({ status: s }).eq("id", task.id);
    if (error) return toast.error("Update failed — reverted");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Link href="/tasks" className="text-xs text-indigo-600 hover:underline">← Tasks</Link>
        <h1 className="mr-auto text-lg font-semibold">{task.title}</h1>
        <select aria-label="Change status quickly" value={task.status} onChange={e => setStatus(e.target.value)} className="h-8 rounded-md border border-slate-300 bg-white px-2 text-sm dark:border-slate-700 dark:bg-slate-900">
          {["backlog","todo","in_progress","in_review","blocked","done"].map(s => <option key={s} value={s}>{s.replace("_"," ")}</option>)}
        </select>
        <Button size="sm" variant="outline" onClick={() => setEditing(true)}><Pencil className="h-4 w-4" />Edit</Button>
        {(role !== "member" || task.creator_id === userId) && <Button size="sm" variant="destructive" onClick={() => setConfirmDel(true)}><Trash2 className="h-4 w-4" /></Button>}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-3 flex flex-wrap gap-2"><StatusBadge status={task.status} /><PriorityBadge priority={task.priority} />{task.task_type && <span className="rounded-full border px-2 py-0.5 text-xs capitalize">{task.task_type}</span>}{task.labels?.map((l: string) => <span key={l} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">#{l}</span>)}</div>
            <p className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300">{task.description || <span className="italic text-slate-400">No description.</span>}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="mb-2 text-sm font-semibold">Comments</h2>
            <div className="space-y-2">
              {(task.task_comments ?? []).map((cm: any) => (
                <div key={cm.id} className="rounded-md bg-slate-50 p-2.5 text-sm dark:bg-slate-800">
                  <p className="text-xs text-slate-500">{cm.author?.full_name ?? "Someone"} · {new Date(cm.created_at).toLocaleString()}</p>
                  <p className="mt-1 whitespace-pre-wrap">{cm.content}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <textarea value={comment} onChange={e => setComment(e.target.value)} rows={2} placeholder="Add a comment…" className="flex-1 rounded-md border border-slate-300 p-2 text-sm dark:border-slate-700 dark:bg-slate-900" />
              <Button size="sm" onClick={postComment}><MessageSquarePlus className="h-4 w-4" />Post</Button>
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="mb-2 text-sm font-semibold">Activity</h2>
            {activity.length === 0 ? <p className="text-xs text-slate-400">No recorded activity yet.</p> : (
              <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                {activity.map((a: any) => <li key={a.id}>• <b>{a.actor?.full_name ?? "System"}</b> {ACTION_LABEL[a.action] ?? a.action} {a.new_values?.status ? `→ ${a.new_values.status.replace("_", " ")}` : ""} <span className="text-slate-400">{new Date(a.created_at).toLocaleString()}</span></li>)}
              </ul>
            )}
          </div>
        </div>
        <div className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm dark:border-slate-800 dark:bg-slate-900">
            <dl className="space-y-2">
              {[["Assignee", task.assignee?.full_name ?? "Unassigned"], ["Creator", task.creator?.full_name ?? "—"], ["Sprint", task.sprint ? task.sprint.name : "Backlog"], ["Project", task.project?.name ?? "—"], ["Start", task.start_date ?? "—"], ["Due", task.due_date ?? "—"], ["Estimate", task.estimated_hours != null ? `${task.estimated_hours} h` : "—"], ["Story points", task.story_points ?? "—"], ["Completed", task.completed_at ? new Date(task.completed_at).toLocaleString() : "—"]].map(([k, v]) => (
                <div key={k as string} className="flex justify-between gap-2"><dt className="text-slate-500">{k}</dt><dd className="truncate text-right font-medium">{v as string}</dd></div>
              ))}
            </dl>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold"><StickyNote className="h-4 w-4" />Linked notes</h2>
            {notes.length === 0 ? <p className="text-xs text-slate-400">No notes linked to this task.</p> : notes.map((n: any) => <Link key={n.id} href={`/notes?open=${n.id}`} className="block truncate py-1 text-sm text-indigo-700 hover:underline dark:text-indigo-300">{n.title}</Link>)}
          </div>
        </div>
      </div>
      <Modal open={editing} onClose={() => setEditing(false)} title="Edit task" wide><TaskForm wsId={wsId} userId={userId} members={members} sprints={sprints} projects={projects} task={task} onDone={() => { setEditing(false); }} /></Modal>
      <ConfirmDialog open={confirmDel} onClose={() => setConfirmDel(false)} danger title="Delete task" message={`Permanently delete "${task.title}"?`} onConfirm={del} />
    </div>
  );
}

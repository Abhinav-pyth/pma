"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { taskSchema } from "@/lib/validation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea, Select } from "@/components/ui/input";
import type { Task, Profile } from "@/types/database";

export function TaskForm({ wsId, userId, members, sprints, projects, task, onDone }: {
  wsId: string; userId: string; members: Profile[]; sprints: { id: string; name: string }[]; projects: { id: string; name: string }[];
  task?: Task | null; onDone: () => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(taskSchema),
    defaultValues: (task ? { ...task, labels: task.labels.join(", "), estimated_hours: task.estimated_hours ?? undefined, story_points: task.story_points ?? undefined } : { status: "todo", priority: "medium", labels: [] }) as any,
  });
  const [labelsVal, setLabelsVal] = useState(task?.labels.join(", ") ?? "");

  async function onSubmit(d: any) {
    setLoading(true);
    const supabase = createClient();
    const payload = {
      ...d,
      labels: String(d.labels ?? "").split(",").map((s: string) => s.trim()).filter(Boolean),
      workspace_id: wsId,
      sprint_id: d.sprint_id || null, project_id: d.project_id || null, assignee_id: d.assignee_id || null,
      start_date: d.start_date || null, due_date: d.due_date || null,
      estimated_hours: d.estimated_hours === "" ? null : d.estimated_hours, story_points: d.story_points === "" ? null : d.story_points,
    };
    let res;
    if (task) res = await supabase.from("tasks").update(payload).eq("id", task.id).select().single();
    else res = await supabase.from("tasks").insert({ ...payload, creator_id: userId }).select().single();
    setLoading(false);
    if (res.error) return toast.error(res.error.message);
    toast.success(task ? "Task updated" : "Task created");
    router.refresh(); onDone();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <div className="space-y-1"><Label htmlFor="t-title">Title *</Label><Input id="t-title" {...register("title")} />{errors.title && <p className="text-xs text-red-600">{errors.title.message as string}</p>}</div>
      <div className="space-y-1"><Label htmlFor="t-desc">Description</Label><Textarea id="t-desc" rows={3} {...register("description")} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1"><Label htmlFor="t-status">Status</Label><Select id="t-status" {...register("status")}>{["backlog","todo","in_progress","in_review","blocked","done"].map(s => <option key={s} value={s}>{s.replace("_"," ")}</option>)}</Select></div>
        <div className="space-y-1"><Label htmlFor="t-priority">Priority</Label><Select id="t-priority" {...register("priority")}>{["low","medium","high","urgent"].map(s => <option key={s} value={s}>{s}</option>)}</Select></div>
        <div className="space-y-1"><Label htmlFor="t-type">Type</Label><Select id="t-type" {...register("task_type")}><option value="">—</option>{["feature","bug","improvement","chore"].map(s => <option key={s} value={s}>{s}</option>)}</Select></div>
        <div className="space-y-1"><Label htmlFor="t-assignee">Assignee</Label><Select id="t-assignee" {...register("assignee_id")}><option value="">Unassigned</option>{members.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}</Select></div>
        <div className="space-y-1"><Label htmlFor="t-start">Start date</Label><Input id="t-start" type="date" {...register("start_date")} /></div>
        <div className="space-y-1"><Label htmlFor="t-due">Due date</Label><Input id="t-due" type="date" {...register("due_date")} />{errors.due_date && <p className="text-xs text-red-600">{errors.due_date.message as string}</p>}</div>
        <div className="space-y-1"><Label htmlFor="t-est">Estimate (hrs)</Label><Input id="t-est" type="number" step="0.5" min="0" {...register("estimated_hours")} /></div>
        <div className="space-y-1"><Label htmlFor="t-sp">Story points</Label><Input id="t-sp" type="number" min="0" {...register("story_points")} /></div>
        <div className="space-y-1"><Label htmlFor="t-sprint">Sprint</Label><Select id="t-sprint" {...register("sprint_id")}><option value="">Backlog (none)</option>{sprints.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></div>
        <div className="space-y-1"><Label htmlFor="t-project">Project</Label><Select id="t-project" {...register("project_id")}><option value="">None</option>{projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></div>
      </div>
      <div className="space-y-1"><Label htmlFor="t-labels">Labels (comma separated)</Label><Input id="t-labels" value={labelsVal} onChange={e => { setLabelsVal(e.target.value); setValue("labels", e.target.value.split(",").map((x: string) => x.trim()).filter(Boolean) as any); }} /></div>
      <div className="flex justify-end gap-2 pt-1"><Button type="button" variant="outline" onClick={onDone}>Cancel</Button><Button type="submit" disabled={loading}>{loading ? "Saving…" : task ? "Save changes" : "Create task"}</Button></div>
    </form>
  );
}

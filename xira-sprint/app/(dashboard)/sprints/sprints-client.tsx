"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, AlertTriangle } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { sprintSchema } from "@/lib/validation";
import { Modal, ConfirmDialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea, Select } from "@/components/ui/input";
import { Progress, EmptyState } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";
import { sprintProgress, detectOverlappingActive } from "@/lib/sprint-math";
import { canManageSprints } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/client";

const STATUS_CLS: Record<string, string> = { planned: "bg-slate-100 text-slate-600 border-slate-200", active: "bg-blue-50 text-blue-700 border-blue-200", completed: "bg-green-50 text-green-700 border-green-200" };

export function SprintsClient({ sprints, projects, wsId, role, today }: any) {
  const router = useRouter();
  const [showNew, setShowNew] = useState(false);
  const [confirmActivate, setConfirmActivate] = useState<any>(null);
  const { register, handleSubmit, formState: { errors }, watch } = useForm({ resolver: zodResolver(sprintSchema), defaultValues: { status: "planned" } });

  async function create(d: any) {
    const supabase = createClient();
    const { error } = await supabase.from("sprints").insert({ ...d, workspace_id: wsId, project_id: d.project_id || null });
    if (error) return toast.error(error.message);
    toast.success("Sprint created"); setShowNew(false); router.refresh();
  }
  async function activate(s: any) {
    const supabase = createClient();
    const { error } = await supabase.from("sprints").update({ status: "active" }).eq("id", s.id);
    if (error) return toast.error(error.message);
    toast.success(`${s.name} is now active`); router.refresh();
  }

  const start = watch("start_date"), end = watch("end_date"), pid = watch("project_id");
  const overlaps = start && end ? detectOverlappingActive(sprints, { start_date: start, end_date: end, project_id: pid || null }) : [];

  if (!canManageSprints(role)) { /* members can view only */ }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2"><h1 className="mr-auto text-lg font-semibold">Sprints</h1>{canManageSprints(role) && <Button size="sm" onClick={() => setShowNew(true)}><Plus className="h-4 w-4" />New sprint</Button>}</div>
      {sprints.length === 0 && <EmptyState title="No sprints yet" description={canManageSprints(role) ? "Create your first sprint to plan the work." : "Ask a team lead or admin to create a sprint."} action={canManageSprints(role) ? <Button size="sm" onClick={() => setShowNew(true)}>Create sprint</Button> : undefined} />}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {sprints.map((s: any) => {
          const st = sprintProgress(s.stats);
          return (
            <div key={s.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-1 flex items-start justify-between gap-2">
                <Link href={`/sprints/${s.id}`} className="text-sm font-semibold hover:text-indigo-600">{s.name}</Link>
                <Badge className={STATUS_CLS[s.status]}>{s.status}</Badge>
              </div>
              <p className="text-xs text-slate-500">{s.start_date} → {s.end_date}{s.status === "active" && ` · ${st.total - st.done} task${st.total - st.done === 1 ? "" : "s"} remaining`}</p>
              <div className="mt-3 flex items-center gap-2"><Progress value={st.pct} /><span className="w-10 shrink-0 text-right text-xs font-medium">{st.pct}%</span></div>
              <p className="mt-1.5 text-[11px] text-slate-400">{st.done}/{st.total} tasks done{st.blocked > 0 && <span className="ml-2 inline-flex items-center gap-1 text-red-500"><AlertTriangle className="h-3 w-3" />{st.blocked} blocked</span>}</p>
              {s.status === "planned" && canManageSprints(role) && (
                <Button size="sm" variant="outline" className="mt-3" onClick={() => {
                  const ov = detectOverlappingActive(sprints.filter((x: any) => x.id !== s.id), { start_date: s.start_date, end_date: s.end_date, project_id: s.project_id });
                  if (ov.length) setConfirmActivate(s); else activate(s);
                }}>Activate</Button>
              )}
            </div>
          );
        })}
      </div>
      <Modal open={showNew} onClose={() => setShowNew(false)} title="New sprint">
        <form onSubmit={handleSubmit(create)} className="space-y-3">
          <div className="space-y-1"><Label>Sprint name *</Label><Input {...register("name")} placeholder="Sprint 12" />{errors.name && <p className="text-xs text-red-600">{errors.name.message as string}</p>}</div>
          <div className="space-y-1"><Label>Goal</Label><Input {...register("goal")} /></div>
          <div className="space-y-1"><Label>Description</Label><Textarea rows={2} {...register("description")} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>Start date *</Label><Input type="date" {...register("start_date")} />{errors.start_date && <p className="text-xs text-red-600">{errors.start_date.message as string}</p>}</div>
            <div className="space-y-1"><Label>End date *</Label><Input type="date" {...register("end_date")} />{errors.end_date && <p className="text-xs text-red-600">{errors.end_date.message as string}</p>}</div>
            <div className="space-y-1"><Label>Status</Label><Select {...register("status")}><option value="planned">Planned</option><option value="active">Active</option><option value="completed">Completed</option></Select></div>
            <div className="space-y-1"><Label>Project</Label><Select {...register("project_id")}><option value="">None</option>{projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></div>
          </div>
          {overlaps.length > 0 && <p className="flex items-start gap-1.5 rounded bg-amber-50 p-2 text-xs text-amber-800 dark:bg-amber-950 dark:text-amber-200"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />Overlaps with active sprint{overlaps.length > 1 ? "s" : ""}: {overlaps.map((o: any) => o.name).join(", ")}. You can still create it, but double-check the dates.</p>}
          <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setShowNew(false)}>Cancel</Button><Button type="submit">Create sprint</Button></div>
        </form>
      </Modal>
      <ConfirmDialog open={!!confirmActivate} onClose={() => setConfirmActivate(null)} title="Overlapping sprint" message={`Another active sprint already covers these dates (${confirmActivate?.name}). Activating will run both concurrently. Continue?`} onConfirm={() => confirmActivate && activate(confirmActivate)} />
    </div>
  );
}

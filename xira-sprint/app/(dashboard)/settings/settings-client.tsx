"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { profileSchema } from "@/lib/validation";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/dialog";
import { canManageWorkspace } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/client";

const TIMEZONES = ["Asia/Kolkata", "UTC", "America/New_York", "America/Los_Angeles", "Europe/London", "Europe/Berlin", "Asia/Singapore", "Australia/Sydney"];

export function SettingsClient({ profile, role, workspace, projects }: any) {
  const router = useRouter();
  const [confirmClose, setConfirmClose] = useState(false);
  const { register, handleSubmit } = useForm({ resolver: zodResolver(profileSchema), defaultValues: { full_name: profile?.full_name ?? "", timezone: profile?.timezone ?? "Asia/Kolkata" } });
  const projForm = useForm({ defaultValues: { name: "" } });

  async function saveProfile(d: any) {
    const supabase = createClient();
    const { error } = await supabase.from("profiles").update(d).eq("id", profile.id);
    if (error) return toast.error(error.message);
    toast.success("Profile saved"); router.refresh();
  }
  async function addProject(d: any) {
    if (!d.name.trim()) return;
    const supabase = createClient();
    const { error } = await supabase.from("projects").insert({ workspace_id: workspace.id, name: d.name.trim() });
    if (error) return toast.error(error.message);
    toast.success("Project created"); projForm.reset(); router.refresh();
  }
  async function archiveProject(p: any) {
    const supabase = createClient();
    const { error } = await supabase.from("projects").update({ status: p.status === "active" ? "archived" : "active" }).eq("id", p.id);
    if (error) return toast.error("Action rejected by policy");
    router.refresh();
  }
  async function renameWorkspace(name: string) {
    const supabase = createClient();
    const { error } = await supabase.from("workspaces").update({ name }).eq("id", workspace.id);
    if (error) return toast.error(error.message);
    toast.success("Workspace renamed"); router.refresh();
  }

  const canManage = canManageWorkspace(role);
  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-lg font-semibold">Settings</h1>
      <section className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-3 text-sm font-semibold">Profile</h2>
        <form onSubmit={handleSubmit(saveProfile)} className="space-y-3">
          <div className="space-y-1"><Label>Full name</Label><Input {...register("full_name")} /></div>
          <div className="space-y-1"><Label>Timezone — dates display in this zone (default Asia/Kolkata)</Label><Select {...register("timezone")}>{TIMEZONES.map(t => <option key={t} value={t}>{t}</option>)}</Select></div>
          <Button type="submit" size="sm">Save profile</Button>
        </form>
      </section>
      <section className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-3 text-sm font-semibold">Projects {canManage ? "" : "(view only for your role)"}</h2>
        <ul className="mb-3 space-y-1 text-sm">
          {projects.length === 0 && <p className="text-xs text-slate-400">No projects yet.</p>}
          {projects.map((p: any) => (
            <li key={p.id} className="flex items-center gap-2">
              <span className={p.status === "archived" ? "text-slate-400 line-through" : ""}>{p.name}</span>
              {p.status === "archived" && <span className="text-[10px] text-slate-400">archived</span>}
              {canManage && <button onClick={() => archiveProject(p)} className="ml-auto text-xs text-indigo-600 hover:underline">{p.status === "active" ? "Archive" : "Restore"}</button>}
            </li>
          ))}
        </ul>
        {canManage && (
          <form onSubmit={projForm.handleSubmit(addProject)} className="flex gap-2">
            <Input placeholder="New project name" {...projForm.register("name")} />
            <Button type="submit" size="sm">Add</Button>
          </form>
        )}
      </section>
      {canManage && (
        <section className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-3 text-sm font-semibold">Workspace ({role === "owner" ? "Owner" : "Admin"} settings)</h2>
          <RenameField name={workspace.name} onSave={renameWorkspace} />
          {role === "owner" && (
            <>
              <p className="mt-3 text-xs text-slate-500">Closing a workspace is permanent and requires explicit confirmation. Ownership transfer: promote another member to Owner in User Management first, then deactivate yourself.</p>
              <Button variant="destructive" size="sm" className="mt-2" onClick={() => setConfirmClose(true)}>Close workspace</Button>
            </>
          )}
        </section>
      )}
      <ConfirmDialog open={confirmClose} onClose={() => setConfirmClose(false)} danger title="Close workspace?" message={`This permanently deletes "${workspace.name}" with all its tasks, sprints, notes and events. This cannot be undone.`} onConfirm={async () => {
        const supabase = createClient();
        const { error } = await supabase.from("workspaces").delete().eq("id", workspace.id);
        if (error) return toast.error("Only the owner may close a workspace.");
        toast.success("Workspace closed"); router.push("/setup-workspace"); router.refresh();
      }} />
    </div>
  );
}
function RenameField({ name, onSave }: { name: string; onSave: (n: string) => void }) {
  const [v, setV] = useState(name);
  return (
    <div className="flex gap-2">
      <Input value={v} onChange={e => setV(e.target.value)} aria-label="Workspace name" />
      <Button size="sm" variant="outline" disabled={!v.trim() || v === name} onClick={() => onSave(v.trim())}>Rename</Button>
    </div>
  );
}

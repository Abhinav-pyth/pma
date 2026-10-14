"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { inviteSchema } from "@/lib/validation";
import { Modal, ConfirmDialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { isOwner } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/client";

export function UserMgmtClient({ members, invitations, wsId, role, userId, origin }: any) {
  const router = useRouter();
  const [showInvite, setShowInvite] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<any>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const { register, handleSubmit, reset, formState: { errors } } = useForm({ resolver: zodResolver(inviteSchema), defaultValues: { role: "member" } });
  const owner = isOwner(role);

  async function invite(d: any) {
    const supabase = createClient();
    const { error } = await supabase.from("workspace_invitations").upsert({ workspace_id: wsId, email: d.email.toLowerCase().trim(), role: d.role, inviter_id: userId, status: "pending", expires_at: new Date(Date.now() + 7 * 864e5).toISOString() }, { onConflict: "workspace_id,email" });
    if (error) return toast.error(error.message);
    toast.success("Invitation created — share the link below");
    setShowInvite(false); reset(); router.refresh();
  }
  async function changeRole(m: any, newRole: string) {
    if (m.user_id === userId) return toast.error("You cannot change your own role.");
    if (newRole === "owner" && !owner) return toast.error("Only the owner can grant ownership.");
    const supabase = createClient();
    const { error } = await supabase.from("workspace_members").update({ role: newRole }).eq("id", m.id);
    if (error) return toast.error("Role change rejected by security policy");
    toast.success(`Role updated to ${newRole.replace("_", " ")}`); router.refresh();
  }
  async function setStatus(m: any, status: string) {
    const supabase = createClient();
    const { error } = await supabase.from("workspace_members").update({ status }).eq("id", m.id);
    if (error) return toast.error("Action rejected");
    toast.success(status === "active" ? "Membership reactivated" : "Membership deactivated"); router.refresh();
  }
  async function remove(m: any) {
    const supabase = createClient();
    const { error } = await supabase.from("workspace_members").delete().eq("id", m.id);
    if (error) return toast.error("Removal rejected — owners and self cannot be removed");
    toast.success("Member removed"); router.refresh();
  }
  async function resend(inv: any) {
    const supabase = createClient();
    const { error } = await supabase.from("workspace_invitations").update({ status: "pending", expires_at: new Date(Date.now() + 7 * 864e5).toISOString() }).eq("id", inv.id);
    if (error) return toast.error(error.message);
    toast.success("Invitation reactivated for 7 more days"); router.refresh();
  }

  const link = (token: string) => `${origin || (typeof window !== "undefined" ? location.origin : "")}/join?token=${token}`;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2"><h1 className="mr-auto text-lg font-semibold">User Management</h1><Button size="sm" onClick={() => setShowInvite(true)}>Invite member</Button></div>
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full text-sm">
          <thead><tr className="border-b text-left text-xs uppercase text-slate-400"><th className="p-3">Name</th><th className="p-3">Role</th><th className="p-3">Status</th><th className="p-3">Joined</th><th className="p-3 hidden md:table-cell">Last active</th><th className="p-3">Actions</th></tr></thead>
          <tbody>
            {members.map((m: any) => (
              <tr key={m.id} className="border-b border-slate-100 last:border-0 dark:border-slate-800">
                <td className="p-3"><p className="font-medium">{m.profile?.full_name}</p><p className="text-xs text-slate-400">{m.user_id === userId ? "you" : ""}</p></td>
                <td className="p-3">
                  {m.user_id === userId || m.role === "owner" ? <Badge className="capitalize border-slate-200 bg-slate-100">{m.role.replace("_", " ")}</Badge> : (
                    <Select aria-label={`Role for ${m.profile?.full_name}`} className="h-8 w-32 text-xs" value={m.role} onChange={e => changeRole(m, e.target.value)}>
                      {["member","team_lead","admin",...(owner ? ["owner"] : [])].map(r => <option key={r} value={r}>{r.replace("_", " ")}</option>)}
                    </Select>
                  )}
                </td>
                <td className="p-3"><Badge className={m.status === "active" ? "border-green-200 bg-green-50 text-green-700" : "border-slate-200 bg-slate-100 text-slate-500"}>{m.status}</Badge></td>
                <td className="p-3 text-xs">{m.joined_at.slice(0, 10)}</td>
                <td className="hidden p-3 text-xs md:table-cell">{m.last_active_at ? new Date(m.last_active_at).toLocaleString() : "—"}</td>
                <td className="p-3">
                  {m.user_id !== userId && m.role !== "owner" && (
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => setStatus(m, m.status === "active" ? "deactivated" : "active")}>{m.status === "active" ? "Deactivate" : "Activate"}</Button>
                      <Button size="sm" variant="ghost" className="text-red-600" onClick={() => setConfirmRemove(m)}>Remove</Button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <section className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-2 text-sm font-semibold">Pending invitations</h2>
        {invitations.length === 0 ? <p className="text-xs text-slate-400">No invitations yet.</p> : (
          <ul className="space-y-2 text-sm">
            {invitations.map((i: any) => (
              <li key={i.id} className="flex flex-wrap items-center gap-2 border-b border-slate-100 pb-2 last:border-0 dark:border-slate-800">
                <span className="font-medium">{i.email}</span><Badge className="capitalize">{i.role.replace("_", " ")}</Badge>
                <Badge className={i.status === "pending" && new Date(i.expires_at) > new Date() ? "border-blue-200 bg-blue-50 text-blue-700" : i.status === "accepted" ? "border-green-200 bg-green-50 text-green-700" : "border-red-200 bg-red-50 text-red-600"}>{new Date(i.expires_at) < new Date() && i.status === "pending" ? "expired" : i.status}</Badge>
                <code className="hidden truncate rounded bg-slate-100 px-2 py-0.5 text-[11px] sm:block dark:bg-slate-800">{link(i.token)}</code>
                <button className="text-xs text-indigo-600 hover:underline" onClick={() => { navigator.clipboard?.writeText(link(i.token)); setCopied(i.id); toast.success("Invite link copied"); }}>Copy link</button>
                {(i.status !== "pending" || new Date(i.expires_at) < new Date()) && <Button size="sm" variant="outline" onClick={() => resend(i)}>Resend</Button>}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-[11px] text-slate-400">Share the invite link with the recipient. They sign up (or sign in) with the same email, then accept to join this workspace with the assigned role.</p>
      </section>
      <Modal open={showInvite} onClose={() => setShowInvite(false)} title="Invite a team member">
        <form onSubmit={handleSubmit(invite)} className="space-y-3">
          <div className="space-y-1"><Label>Email</Label><Input type="email" {...register("email")} placeholder="teammate@company.dev" />{errors.email && <p className="text-xs text-red-600">{errors.email.message as string}</p>}</div>
          <div className="space-y-1"><Label>Role</Label><Select {...register("role")}><option value="member">Member</option><option value="team_lead">Team Lead</option><option value="admin">Admin</option></Select></div>
          <p className="text-xs text-slate-400">Owners cannot be invited — ownership transfers only via an explicit owner action.</p>
          <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setShowInvite(false)}>Cancel</Button><Button type="submit">Create invitation</Button></div>
        </form>
      </Modal>
      <ConfirmDialog open={!!confirmRemove} onClose={() => setConfirmRemove(null)} danger title="Remove member" message={`Remove ${confirmRemove?.profile?.full_name} from this workspace? Their personal plans remain but they lose access.`} onConfirm={() => confirmRemove && remove(confirmRemove)} />
    </div>
  );
}

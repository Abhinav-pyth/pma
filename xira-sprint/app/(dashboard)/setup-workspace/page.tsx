"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { workspaceSchema } from "@/lib/validation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

export default function SetupWorkspacePage({ searchParams }: { searchParams: Promise<{ invite?: string }> }) {
  return <SetupInner inviteToken={(searchParams as any)?.invite} />;
}
function SetupInner({ inviteToken }: { inviteToken?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(workspaceSchema) });

  async function createWs(d: any) {
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("create_workspace", { ws_name: d.name });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Workspace created — you are the Owner");
    router.push("/dashboard"); router.refresh();
  }
  async function accept() {
    if (!inviteToken) return;
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.rpc("accept_invitation", { invite_token: inviteToken });
    setLoading(false);
    if (error) return toast.error(error.message.replace(/invitation.*/i, "This invitation is no longer valid."));
    toast.success("Joined workspace");
    router.push("/dashboard"); router.refresh();
  }
  return (
    <div className="mx-auto mt-24 max-w-md space-y-6">
      <div className="text-center"><h1 className="text-xl font-semibold">Welcome to SprintDesk</h1><p className="text-sm text-slate-500">Create a workspace for your team, or join one with an invitation.</p></div>
      {inviteToken && (
        <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4 dark:border-indigo-900 dark:bg-indigo-950">
          <p className="mb-2 text-sm font-medium">You have a pending invitation.</p>
          <Button onClick={accept} disabled={loading}>{loading ? "Joining…" : "Accept invitation"}</Button>
        </div>
      )}
      <form onSubmit={handleSubmit(createWs)} className="space-y-3 rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-sm font-semibold">Create a workspace</h2>
        <div className="space-y-1"><Label htmlFor="name">Workspace name</Label><Input id="name" placeholder="e.g. Acme Engineering" {...register("name")} />{errors.name && <p className="text-xs text-red-600">{errors.name.message as string}</p>}</div>
        <Button type="submit" disabled={loading} className="w-full">{loading ? "Creating…" : "Create workspace"}</Button>
      </form>
      <p className="text-center text-xs text-slate-500"><Link href="/dashboard" className="underline">Skip for now</Link></p>
    </div>
  );
}

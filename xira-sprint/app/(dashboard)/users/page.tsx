import { redirect } from "next/navigation";
import { ws } from "@/components/ws-context";
import { getMembers } from "@/services/workspace";
import { canManageMembers } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { UserMgmtClient } from "./users-client";

export default async function UsersPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const c = await ws(sp);
  if (!c) return null;
  if (!canManageMembers(c.role)) redirect("/dashboard"); // server-side enforcement (also enforced by RLS)
  const members = await getMembers(c.wsId);
  const supabase = await createClient();
  const { data: invites } = await supabase.from("workspace_invitations").select("*").eq("workspace_id", c.wsId).order("created_at", { ascending: false });
  return <UserMgmtClient members={members as any[]} invitations={(invites ?? []) as any[]} wsId={c.wsId} role={c.role} userId={c.userId} origin={process.env.NEXT_PUBLIC_APP_URL ?? ""} />;
}

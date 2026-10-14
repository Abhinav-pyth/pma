import { createClient } from "@/lib/supabase/server";
import type { Workspace, WorkspaceMember, Profile, WorkspaceRole } from "@/types/database";

export interface MembershipContext { user: { id: string; email?: string }; profile: Profile | null; workspaces: { workspace: Workspace; role: WorkspaceRole; status: string }[]; activeWorkspaceId: string | null; }

export async function getMembership(activeWsId?: string | null): Promise<MembershipContext | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  const { data: members } = await supabase.from("workspace_members")
    .select("role,status,workspace:workspaces(*)")
    .eq("user_id", user.id);
  const workspaces = (members ?? []).map((m: any) => ({ workspace: m.workspace as Workspace, role: m.role as WorkspaceRole, status: m.status })).filter(x => x.workspace);
  const active = activeWsId && workspaces.some(w => w.workspace.id === activeWsId) ? activeWsId : workspaces[0]?.workspace.id ?? null;
  return { user: { id: user.id, email: user.email }, profile: profile ?? null, workspaces, activeWorkspaceId: active };
}

export async function currentRole(wsId: string): Promise<WorkspaceRole | null> {
  const ctx = await getMembership(wsId);
  return ctx?.workspaces.find(w => w.workspace.id === wsId)?.role ?? null;
}

export async function getMembers(wsId: string): Promise<WorkspaceMember[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("workspace_members")
    .select("*, profile:profiles(*)").eq("workspace_id", wsId).order("joined_at");
  return (data ?? []) as unknown as WorkspaceMember[];
}

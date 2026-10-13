import { getMembership } from "@/services/workspace";
import { createClient } from "@/lib/supabase/server";

export async function ws(searchParams?: Record<string, string | string[] | undefined>) {
  const ctx = await getMembership((searchParams?.ws as string) ?? null);
  if (!ctx || !ctx.activeWorkspaceId) return null;
  const supabase = await createClient();
  return { ctx, wsId: ctx.activeWorkspaceId, userId: ctx.user.id, role: ctx.workspaces.find(w => w.workspace.id === ctx.activeWorkspaceId)!.role, today: new Intl.DateTimeFormat("en-CA", { timeZone: ctx.profile?.timezone || "Asia/Kolkata" }).format(new Date()) };
}

import { redirect } from "next/navigation";
import { getMembership } from "@/services/workspace";
import { createClient } from "@/lib/supabase/server";
import { Shell } from "@/components/layout/shell";

export default async function DashboardLayout({ children, params }: { children: React.ReactNode; params: Promise<{ [k: string]: string }> }) {
  const cookieStore = await (await import("next/headers")).cookies();
  const wsParam = (await params as any)?.ws ?? cookieStore.get("sd_ws")?.value ?? null;
  const ctx = await getMembership(wsParam);
  if (!ctx) redirect("/login");
  if (ctx.workspaces.length === 0) redirect(ctx.user.email ? "/setup-workspace" : "/login");
  const supabase = await createClient();
  const { data: notifs } = await supabase.from("notifications").select("id,title,link,read,created_at").eq("user_id", ctx.user.id).order("created_at", { ascending: false }).limit(30);
  const active = ctx.workspaces.find(w => w.workspace.id === ctx.activeWorkspaceId)!;
  return (
    <Shell workspaces={ctx.workspaces.map(w => ({ id: w.workspace.id, name: w.workspace.name, role: w.role }))}
      activeWsId={ctx.activeWorkspaceId} userName={ctx.profile?.full_name || ctx.user.email || ""}
      role={active.role} notifications={notifs ?? []}>
      {children}
    </Shell>
  );
}

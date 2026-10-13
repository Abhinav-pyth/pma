import { ws } from "@/components/ws-context";
import { createClient } from "@/lib/supabase/server";
import { SettingsClient } from "./settings-client";

export default async function SettingsPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const c = await ws(await searchParams);
  if (!c) return null;
  const supabase = await createClient();
  const { data: projects } = await supabase.from("projects").select("*").eq("workspace_id", c.wsId).order("created_at");
  const workspace = c.ctx.workspaces.find(w => w.workspace.id === c.wsId)!;
  return <SettingsClient profile={c.ctx.profile} role={c.role} workspace={workspace} projects={(projects ?? []) as any[]} />;
}

import { ws } from "@/components/ws-context";
import { listSprints, sprintTasks } from "@/services/sprints";
import { createClient } from "@/lib/supabase/server";
import { SprintsClient } from "./sprints-client";

export default async function SprintsPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const c = await ws(sp);
  if (!c) return null;
  const sprints = await listSprints(c.wsId);
  const supabase = await createClient();
  const { data: projects } = await supabase.from("projects").select("id,name").eq("workspace_id", c.wsId).order("name");
  const withStats = await Promise.all(sprints.map(async s => ({ ...s, stats: (await sprintTasks(s.id)) as any[] })));
  return <SprintsClient sprints={withStats} projects={(projects ?? []) as any[]} wsId={c.wsId} role={c.role} today={c.today} />;
}

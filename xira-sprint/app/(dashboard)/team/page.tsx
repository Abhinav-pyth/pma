import { ws } from "@/components/ws-context";
import { getMembers } from "@/services/workspace";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/misc";

export default async function TeamPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const c = await ws(await searchParams);
  if (!c) return null;
  const members = await getMembers(c.wsId);
  const supabase = await createClient();
  const { data: todayScrum } = await supabase.from("daily_scrum_updates").select("user_id,has_blocker").eq("workspace_id", c.wsId).eq("scrum_date", c.today);
  const scrumByUser = new Map((todayScrum ?? []).map((s: any) => [s.user_id, s]));
  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">Team</h1>
      {members.length === 0 ? <EmptyState title="No members" /> : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {members.map(m => (
            <Card key={m.id}>
              <CardHeader className="flex-row items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">{(m.profile?.full_name ?? "?")[0].toUpperCase()}</div>
                <div className="min-w-0"><CardTitle className="truncate">{m.profile?.full_name}</CardTitle><p className="truncate text-xs text-slate-500">{m.joined_at.slice(0, 10)} · {m.status}</p></div>
                <Badge className="ml-auto capitalize border-slate-200 bg-slate-100 text-slate-600">{m.role.replace("_", " ")}</Badge>
              </CardHeader>
              <CardContent className="flex items-center gap-2 text-xs">
                {scrumByUser.has(m.user_id)
                  ? <span className={`rounded-full px-2 py-0.5 ${scrumByUser.get(m.user_id).has_blocker ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>{scrumByUser.get(m.user_id).has_blocker ? "Update submitted · blocker 🚧" : "Update submitted ✓"}</span>
                  : <span className="rounded-full bg-amber-50 px-2 py-0.5 text-amber-700">Scrum update pending</span>}
                {m.last_active_at && <span className="ml-auto text-slate-400">active {new Date(m.last_active_at).toLocaleDateString()}</span>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

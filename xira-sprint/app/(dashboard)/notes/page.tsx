import { ws } from "@/components/ws-context";
import { listNotes } from "@/services/notes";
import { listSprints } from "@/services/sprints";
import { createClient } from "@/lib/supabase/server";
import { NotesClient } from "./notes-client";

export default async function NotesPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const c = await ws(sp);
  if (!c) return null;
  const supabase = await createClient();
  const [notes, sprints] = await Promise.all([listNotes(c.wsId), listSprints(c.wsId)]);
  const { data: tasks } = await supabase.from("tasks").select("id,title").eq("workspace_id", c.wsId).limit(300);
  return <NotesClient notes={notes as any[]} sprints={sprints} tasks={(tasks ?? []) as any[]} userId={c.userId} wsId={c.wsId} initialOpen={sp.open} initialNew={sp.new === "1"} prefillTitle={sp.title ? decodeURIComponent(sp.title) : ""} prefillEvent={sp.event} />;
}

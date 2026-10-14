import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q")?.trim();
  if (!q || q.length < 2) return NextResponse.json({ results: [] });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ results: [] }, { status: 401 });
  const like = `%${q}%`;
  const [tasks, sprints, notes, events, projects] = await Promise.all([
    supabase.from("tasks").select("id,title").ilike("title", like).limit(5),
    supabase.from("sprints").select("id,name").ilike("name", like).limit(5),
    supabase.from("notes").select("id,title").ilike("title", like).limit(5),
    supabase.from("calendar_events").select("id,title").ilike("title", like).limit(5),
    supabase.from("projects").select("id,name").ilike("name", like).limit(5),
  ]);
  const results = [
    ...(tasks.data ?? []).map(t => ({ type: "Tasks", id: t.id, title: t.title, href: `/tasks/${t.id}` })),
    ...(sprints.data ?? []).map(s => ({ type: "Sprints", id: s.id, title: s.name, href: `/sprints/${s.id}` })),
    ...(notes.data ?? []).map(n => ({ type: "Notes", id: n.id, title: n.title, href: `/notes?open=${n.id}` })),
    ...(events.data ?? []).map(e => ({ type: "Calendar", id: e.id, title: e.title, href: `/calendar?event=${e.id}` })),
    ...(projects.data ?? []).map(p => ({ type: "Projects", id: p.id, title: p.name, href: `/tasks?project_id=${p.id}` })),
  ];
  return NextResponse.json({ results });
}

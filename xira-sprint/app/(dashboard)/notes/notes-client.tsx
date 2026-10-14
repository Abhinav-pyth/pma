"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Pin, PinOff, Archive, Trash2, Search, Lock, Globe, StickyNote } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { noteSchema } from "@/lib/validation";
import { Modal, ConfirmDialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea, Select } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/misc";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

export function NotesClient({ notes, sprints, tasks, userId, wsId, initialOpen, initialNew, prefillTitle, prefillEvent }: any) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<any>(initialOpen ? notes.find((n: any) => n.id === initialOpen) : null);
  const [showForm, setShowForm] = useState(initialNew || false);
  const [editing, setEditing] = useState<any>(null);
  const [confirmDel, setConfirmDel] = useState<any>(null);
  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm({ resolver: zodResolver(noteSchema), defaultValues: { title: prefillTitle ?? "", content: "", visibility: "private", pinned: false, tags: [], calendar_event_id: prefillEvent ?? null } });
  const vis = watch("visibility");

  const filtered = notes.filter((n: any) => !q || (n.title + " " + n.content).toLowerCase().includes(q.toLowerCase()));

  async function save(d: any) {
    const supabase = createClient();
    const payload = { ...d, workspace_id: wsId, task_id: d.task_id || null, sprint_id: d.sprint_id || null, project_id: d.project_id || null, calendar_event_id: d.calendar_event_id || null, tags: Array.isArray(d.tags) ? d.tags : String(d.tags || "").split(",").map((s: string) => s.trim()).filter(Boolean) };
    let res;
    if (editing) res = await supabase.from("notes").update(payload).eq("id", editing.id).select().single();
    else res = await supabase.from("notes").insert({ ...payload, creator_id: userId }).select().single();
    if (res.error) return toast.error(res.error.message);
    toast.success(editing ? "Note updated" : "Note created");
    setShowForm(false); setEditing(null); router.refresh();
  }
  async function toggle(n: any, patch: any, msg: string) {
    const supabase = createClient();
    const { error } = await supabase.from("notes").update(patch).eq("id", n.id);
    if (error) return toast.error(error.message);
    toast.success(msg); router.refresh();
  }
  async function del(n: any) {
    const supabase = createClient();
    const { error } = await supabase.from("notes").delete().eq("id", n.id);
    if (error) return toast.error("Delete failed");
    toast.success("Note deleted"); setOpen(null); router.refresh();
  }
  function startEdit(n: any) {
    setEditing(n);
    reset({ title: n.title, content: n.content, visibility: n.visibility, pinned: n.pinned, tags: n.tags.join(", "), task_id: n.task_id ?? "", sprint_id: n.sprint_id ?? "", calendar_event_id: n.calendar_event_id ?? "" } as any);
    setShowForm(true);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="mr-auto text-lg font-semibold">Notes</h1>
        <div className="relative"><Search className="absolute left-2 top-2 h-4 w-4 text-slate-400" /><Input aria-label="Search notes" placeholder="Search…" value={q} onChange={e => setQ(e.target.value)} className="w-48 pl-8" /></div>
        <Button size="sm" onClick={() => { setEditing(null); reset({ title: "", content: "", visibility: "private", pinned: false, tags: [] } as any); setShowForm(true); }}><Plus className="h-4 w-4" />New note</Button>
      </div>
      {filtered.length === 0 ? <EmptyState icon={<StickyNote className="h-6 w-6 text-slate-300" />} title={q ? "No notes match your search" : "No notes yet"} description="Capture meeting minutes, decisions and snippets. Link them to tasks and sprints." action={!q && <Button size="sm" onClick={() => setShowForm(true)}>Create a note</Button>} /> : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((n: any) => (
            <button key={n.id} onClick={() => setOpen(n)} className="rounded-lg border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:shadow dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-1 flex items-center gap-1.5">
                {n.pinned && <Pin className="h-3.5 w-3.5 text-amber-500" />}
                <span className="truncate text-sm font-semibold">{n.title}</span>
                <span className="ml-auto shrink-0" title={n.visibility}>{n.visibility === "private" ? <Lock className="h-3.5 w-3.5 text-slate-400" /> : <Globe className="h-3.5 w-3.5 text-slate-400" />}</span>
              </div>
              <p className="line-clamp-3 whitespace-pre-wrap text-xs text-slate-500">{n.content || "Empty note"}</p>
              <p className="mt-2 text-[10px] text-slate-400">{n.creator?.full_name?.split(" ")[0]} · {new Date(n.updated_at).toLocaleDateString()} {n.archived && "· archived"}</p>
            </button>
          ))}
        </div>
      )}

      <Modal open={!!open && !showForm} onClose={() => setOpen(null)} title={open?.title} wide>
        {open && (
          <div className="space-y-3">
            <p className="whitespace-pre-wrap rounded bg-slate-50 p-3 text-sm dark:bg-slate-800">{open.content}</p>
            {open.tags?.length > 0 && <p className="text-xs text-slate-500">{open.tags.map((t: string) => `#${t}`).join("  ")}</p>}
            {(open.task_id || open.sprint_id) && <p className="text-xs">Linked: {open.task_id && <a href={`/tasks/${open.task_id}`} className="text-indigo-600 underline">task</a>} {open.sprint_id && <a href={`/sprints/${open.sprint_id}`} className="ml-1 text-indigo-600 underline">sprint</a>}</p>}
            {open.creator_id === userId && (
              <div className="flex flex-wrap justify-end gap-2 border-t pt-3">
                <Button size="sm" variant="outline" onClick={() => toggle(open, { pinned: !open.pinned }, open.pinned ? "Unpinned" : "Pinned")}>{open.pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}{open.pinned ? "Unpin" : "Pin"}</Button>
                <Button size="sm" variant="outline" onClick={() => toggle(open, { archived: !open.archived }, open.archived ? "Restored" : "Archived")}><Archive className="h-4 w-4" />{open.archived ? "Restore" : "Archive"}</Button>
                <Button size="sm" variant="outline" onClick={() => { const n = open; setOpen(null); startEdit(n); }}>Edit</Button>
                <Button size="sm" variant="destructive" onClick={() => { setConfirmDel(open); }}><Trash2 className="h-4 w-4" /></Button>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal open={showForm} onClose={() => setShowForm(false)} title={editing ? "Edit note" : "New note"} wide>
        <form onSubmit={handleSubmit(save)} className="space-y-3">
          <div className="space-y-1"><Label>Title *</Label><Input {...register("title")} />{errors.title && <p className="text-xs text-red-600">{errors.title.message as string}</p>}</div>
          <div className="space-y-1"><Label>Content (Markdown-compatible)</Label><Textarea rows={8} {...register("content")} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>Visibility</Label><Select {...register("visibility")}><option value="private">Private — only you (enforced by RLS)</option><option value="workspace">Workspace — visible to members</option></Select></div>
            <div className="space-y-1"><Label>Link task</Label><Select {...register("task_id")}><option value="">None</option>{tasks.map((t: any) => <option key={t.id} value={t.id}>{t.title}</option>)}</Select></div>
            <div className="space-y-1"><Label>Link sprint</Label><Select {...register("sprint_id")}><option value="">None</option>{sprints.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></div>
            <div className="space-y-1"><Label>Tags (comma separated)</Label><Input {...register("tags" as any)} defaultValue={(watch("tags") as unknown as string[] | undefined)?.join(", ") ?? ""} /></div>
          </div>
          <p className={cn("text-xs", vis === "private" ? "text-slate-500" : "text-blue-600")}>{vis === "private" ? "🔒 Private: enforced in the database via Row Level Security." : "🌐 Workspace members can read this note."}</p>
          <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button><Button type="submit">{editing ? "Save" : "Create"}</Button></div>
        </form>
      </Modal>
      <ConfirmDialog open={!!confirmDel} onClose={() => setConfirmDel(null)} danger title="Delete note" message={`Permanently delete "${confirmDel?.title}"?`} onConfirm={() => confirmDel && del(confirmDel)} />
    </div>
  );
}

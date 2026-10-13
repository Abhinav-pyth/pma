"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format, parseISO, subDays, addDays } from "date-fns";
import { ChevronLeft, ChevronRight, AlertTriangle, Send, CheckCircle2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label, Textarea, Select } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/misc";
import { StatusBadge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

export function ScrumClient({ date, today, updates, members, mine, sprints, myTasks, weekHistory, activeSprint, userId, wsId, role, canReview }: any) {
  const router = useRouter();
  const [yesterday, setYesterday] = useState(mine?.yesterday ?? "");
  const [todaysPlan, setTodayPlan] = useState(mine?.today ?? "");
  const [blockers, setBlockers] = useState(mine?.blockers ?? "");
  const [sprintId, setSprintId] = useState(mine?.sprint_id ?? activeSprint?.id ?? "");
  const [taskIds, setTaskIds] = useState<string[]>(mine?.daily_scrum_tasks?.map((t: any) => t.task_id) ?? []);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"today" | "week">("today");
  const [filter, setFilter] = useState<{ sprint?: string; member?: string; blockersOnly?: boolean }>({});

  async function submit() {
    if (!yesterday.trim() || !todaysPlan.trim()) return toast.error("Yesterday and Today are required");
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.rpc("upsert_scrum_update", { ws: wsId, sdate: date, sid: sprintId || null, y: yesterday, t: todaysPlan, b: blockers, task_ids: taskIds });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success(mine ? "Update saved" : "Daily scrum update submitted");
    router.refresh();
  }

  const shown = updates.filter((u: any) => (!filter.member || u.user_id === filter.member) && (!filter.sprint || u.sprint_id === filter.sprint) && (!filter.blockersOnly || u.has_blocker));
  const submittedIds = new Set(updates.map((u: any) => u.user_id));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="mr-auto text-lg font-semibold">Daily Scrum</h1>
        <button aria-label="Previous day" onClick={() => router.push(`/scrum?date=${format(subDays(parseISO(date), 1), "yyyy-MM-dd")}`)} className="rounded-md border p-1.5 hover:bg-slate-50 dark:hover:bg-slate-800"><ChevronLeft className="h-4 w-4" /></button>
        <span className="min-w-36 text-center text-sm font-medium">{format(parseISO(date), "EEEE, MMM d")}</span>
        <button aria-label="Next day" onClick={() => router.push(`/scrum?date=${format(addDays(parseISO(date), 1), "yyyy-MM-dd")}`)} className="rounded-md border p-1.5 hover:bg-slate-50 dark:hover:bg-slate-800"><ChevronRight className="h-4 w-4" /></button>
      </div>
      <div className="flex gap-2 text-sm">
        <button onClick={() => setTab("today")} className={cn("rounded-md px-3 py-1.5 text-xs font-medium", tab === "today" ? "bg-indigo-600 text-white" : "border border-slate-300 dark:border-slate-700")}>Team overview ({date})</button>
        <button onClick={() => setTab("week")} className={cn("rounded-md px-3 py-1.5 text-xs font-medium", tab === "week" ? "bg-indigo-600 text-white" : "border border-slate-300 dark:border-slate-700")}>My week</button>
      </div>

      {tab === "today" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="mb-3 text-sm font-semibold">{mine ? "Edit my update for this date" : "Submit update"}</h2>
            <div className="space-y-3">
              <div className="space-y-1"><Label htmlFor="s-y">Yesterday — what did I complete?</Label><Textarea id="s-y" rows={2} value={yesterday} onChange={e => setYesterday(e.target.value)} placeholder="Finished the auth refactor…" /></div>
              <div className="space-y-1"><Label htmlFor="s-t">Today — what am I planning to do?</Label><Textarea id="s-t" rows={2} value={todaysPlan} onChange={e => setTodayPlan(e.target.value)} /></div>
              <div className="space-y-1"><Label htmlFor="s-b">Blockers — anything in my way?</Label><Textarea id="s-b" rows={2} value={blockers} onChange={e => setBlockers(e.target.value)} placeholder="Leave empty if none" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label htmlFor="s-sp">Sprint</Label><Select id="s-sp" value={sprintId} onChange={e => setSprintId(e.target.value)}><option value="">None</option>{sprints.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></div>
                <div className="space-y-1"><Label>Link tasks</Label>
                  <div className="max-h-24 overflow-y-auto rounded border border-slate-200 p-1.5 dark:border-slate-700">
                    {myTasks.length === 0 && <p className="text-xs text-slate-400">No open assigned tasks.</p>}
                    {myTasks.map((t: any) => (
                      <label key={t.id} className="flex items-center gap-1.5 text-xs">
                        <input type="checkbox" checked={taskIds.includes(t.id)} onChange={e => setTaskIds(v => e.target.checked ? [...v, t.id] : v.filter(x => x !== t.id))} />
                        <span className="truncate">{t.title}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <Button onClick={submit} disabled={loading}><Send className="h-4 w-4" />{mine ? "Save changes" : "Submit today's update"}</Button>
              {mine && mine.edit_history?.length > 0 && <p className="text-[11px] text-slate-400">{mine.edit_history.length} previous version(s) preserved in edit history.</p>}
            </div>
          </section>
          <section className="space-y-3">
            <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
                <b className="font-semibold">Status:</b>
                {members.map((m: any) => (
                  <span key={m.id} className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5", submittedIds.has(m.id) ? "border-green-200 bg-green-50 text-green-700" : "border-amber-200 bg-amber-50 text-amber-700")}>
                    {submittedIds.has(m.id) ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}{m.full_name.split(" ")[0]}
                  </span>
                ))}
              </div>
              {canReview && (
                <div className="flex flex-wrap gap-2">
                  <Select aria-label="Filter by member" className="h-8 w-auto text-xs" value={filter.member ?? ""} onChange={e => setFilter(f => ({ ...f, member: e.target.value || undefined }))}><option value="">All members</option>{members.map((m: any) => <option key={m.id} value={m.id}>{m.full_name}</option>)}</Select>
                  <Select aria-label="Filter by sprint" className="h-8 w-auto text-xs" value={filter.sprint ?? ""} onChange={e => setFilter(f => ({ ...f, sprint: e.target.value || undefined }))}><option value="">All sprints</option>{sprints.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select>
                  <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={!!filter.blockersOnly} onChange={e => setFilter(f => ({ ...f, blockersOnly: e.target.checked }))} />Blockers only</label>
                </div>
              )}
            </div>
            {shown.length === 0 ? <EmptyState title="No updates yet for this date" description="Submissions appear here as team members post them. Pending stays pending — nothing is fabricated." /> : shown.map((u: any) => (
              <div key={u.id} className={cn("rounded-lg border bg-white p-3 dark:bg-slate-900", u.has_blocker ? "border-red-200" : "border-slate-200 dark:border-slate-800")}>
                <p className="mb-1 text-sm font-semibold">{u.profile?.full_name ?? "Unknown"} <span className="ml-1 text-[11px] font-normal text-slate-400">{new Date(u.submitted_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span></p>
                <dl className="space-y-1 text-xs">
                  <div><dt className="inline font-medium text-slate-500">Did:&nbsp;</dt><dd className="inline whitespace-pre-wrap">{u.yesterday}</dd></div>
                  <div><dt className="inline font-medium text-slate-500">Will:&nbsp;</dt><dd className="inline whitespace-pre-wrap">{u.today}</dd></div>
                  {u.has_blocker && <div className="mt-1 flex items-start gap-1 rounded bg-red-50 p-1.5 text-red-700 dark:bg-red-950 dark:text-red-300"><AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" /><span className="whitespace-pre-wrap">{u.blockers}</span></div>}
                </dl>
                {u.daily_scrum_tasks?.length > 0 && <div className="mt-2 flex flex-wrap gap-1.5">{u.daily_scrum_tasks.map((st: any) => st.task && <Link key={st.task_id} href={`/tasks/${st.task_id}`} className="inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[11px] hover:bg-slate-50 dark:hover:bg-slate-800">{st.task.title}<StatusBadge status={st.task.status} /></Link>)}</div>}
              </div>
            ))}
          </section>
        </div>
      ) : (
        <div className="space-y-3">
          {weekHistory.length === 0 ? <EmptyState title="No updates this week" description="Your submitted scrum updates for this week will appear here." /> : weekHistory.map((u: any) => (
            <div key={u.id} className="rounded-lg border border-slate-200 bg-white p-3 text-xs dark:border-slate-800 dark:bg-slate-900">
              <p className="mb-1 font-semibold text-sm">{format(parseISO(u.scrum_date), "EEE, MMM d")}{u.has_blocker && <span className="ml-2 rounded bg-red-50 px-1.5 py-0.5 text-[10px] text-red-600">blocker</span>}</p>
              <p><b className="text-slate-500">Did:</b> {u.yesterday}</p><p><b className="text-slate-500">Will:</b> {u.today}</p>
              {u.blockers && <p className="text-red-600"><b>Blocked:</b> {u.blockers}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

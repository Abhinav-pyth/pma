"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Sun, AlertTriangle, CalendarClock, CheckCircle2, Repeat, Flag, MessagesSquare, Send, ListTodo, Calendar, Activity, StickyNote } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress, EmptyState } from "@/components/ui/misc";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fmtDate } from "@/lib/date";
import { createClient } from "@/lib/supabase/client";

const WIDGETS = [
  { key: "dueToday", label: "Due today", icon: Sun, cls: "text-indigo-600" },
  { key: "overdue", label: "Overdue", icon: AlertTriangle, cls: "text-red-600" },
  { key: "dueThisWeek", label: "Due this week", icon: CalendarClock, cls: "text-blue-600" },
  { key: "completedThisWeek", label: "Completed this week", icon: CheckCircle2, cls: "text-green-600" },
  { key: "blocked", label: "Blocked", icon: Flag, cls: "text-red-500" },
  { key: "pendingScrum", label: "Pending scrum updates", icon: MessagesSquare, cls: "text-amber-600" },
];

export function DashboardClient({ today, stats, todaysFocus, activeSprint, sprintStats, sprintDaysLeft, activity, upcoming, submittedScrum }: any) {
  const router = useRouter();
  async function completeInline(taskId: string) {
    const supabase = createClient();
    const { error } = await supabase.from("tasks").update({ status: "done" }).eq("id", taskId);
    if (error) return toast.error("Update failed — rolled back");
    toast.success("Task completed 🎉");
    router.refresh();
  }
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="mr-auto text-lg font-semibold">Dashboard</h1>
        <Link href="/scrum"><Button size="sm"><Send className="h-4 w-4" />{submittedScrum ? "Edit today's update" : "Submit today's update"}</Button></Link>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {WIDGETS.map(w => (
          <Card key={w.key}><CardContent className="p-3 text-center">
            <w.icon className={`mx-auto h-4 w-4 ${w.cls}`} />
            <p className="mt-1 text-xl font-bold">{stats[w.key]}</p>
            <p className="text-[11px] uppercase tracking-wide text-slate-400">{w.label}</p>
          </CardContent></Card>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <section className="lg:col-span-2 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold"><Sun className="h-4 w-4 text-amber-500" />Today&apos;s Focus · {fmtDate(today, "EEEE, MMMM d")}</h2>
          {todaysFocus.length === 0 ? <EmptyState title="Nothing on your plate today" description="Plan a day in My Day or check open tasks." action={<Link href="/my-day"><Button size="sm">Open My Day</Button></Link>} /> : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {todaysFocus.map((p: any) => {
                const t = p.task ?? p;
                return (
                  <li key={t.id} className="flex items-center gap-2 py-2 text-sm">
                    <button aria-label="Mark complete" onClick={() => completeInline(t.id)} className="shrink-0 text-slate-300 hover:text-green-600"><CheckCircle2 className="h-5 w-5" /></button>
                    <Link href={`/tasks/${t.id}`} className="min-w-0 flex-1 truncate font-medium hover:underline">{t.title}</Link>
                    <span className="hidden shrink-0 sm:block"><StatusBadge status={t.status} /></span>
                    {t.priority && <span className="hidden text-[11px] capitalize text-slate-400 md:inline">{t.priority}</span>}
                    {t.due_date && <span className="shrink-0 text-[11px] text-slate-400">{t.due_date === today ? "today" : t.due_date}</span>}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
        <section className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold"><Repeat className="h-4 w-4 text-indigo-500" />Current Sprint</h2>
          {!activeSprint ? <p className="text-xs text-slate-400">No active sprint. <Link href="/sprints" className="text-indigo-600 underline">View sprints</Link></p> : (
            <>
              <Link href={`/sprints/${activeSprint.id}`} className="text-sm font-semibold hover:underline">{activeSprint.name}</Link>
              <p className="text-xs text-slate-500">{activeSprint.start_date} → {activeSprint.end_date} · {sprintDaysLeft} day(s) left</p>
              <div className="mt-3 flex items-center gap-2"><Progress value={sprintStats.pct} /><span className="text-sm font-semibold">{sprintStats.pct}%</span></div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                {[["Done", sprintStats.done], ["In progress", sprintStats.inProgress], ["Open", sprintStats.open], ["Blocked", sprintStats.blocked]].map(([k, v]) => (
                  <div key={k as string} className="rounded bg-slate-50 p-2 dark:bg-slate-800"><b>{v as number}</b> <span className="text-slate-500">{k as string}</span></div>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-slate-400">Story points: {sprintStats.storyDone}/{sprintStats.storyTotal} · Remaining effort ≈ {sprintStats.remainingHours}h</p>
            </>
          )}
        </section>
        <section className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold"><Activity className="h-4 w-4 text-purple-500" />Team Activity</h2>
          {activity.length === 0 ? <p className="text-xs text-slate-400">No recent activity in this workspace.</p> : (
            <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
              {activity.map((a: any) => (
                <li key={a.id} className="flex gap-1.5">
                  <span className="shrink-0 text-slate-400">{new Date(a.created_at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                  <span className="min-w-0 truncate"><b>{a.actor?.full_name?.split(" ")[0] ?? "Someone"}</b> {a.action.replace(/_/g, " ")} <Link className="text-indigo-600 hover:underline" href={`/tasks/${a.task?.id}`}>{a.task?.title}</Link>{a.new_values?.status ? ` (${a.new_values.status.replace("_", " ")})` : ""}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="lg:col-span-2 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold"><CalendarClock className="h-4 w-4 text-blue-500" />Upcoming deadlines & meetings</h2>
          {upcoming.length === 0 ? <p className="text-xs text-slate-400">Nothing scheduled in the near future.</p> : (
            <ul className="grid gap-1.5 sm:grid-cols-2">
              {upcoming.map((e: any) => (
                <li key={e.id}>
                  <Link href={e.task_id ? `/tasks/${e.task_id}` : "/calendar"} className="flex items-center gap-2 rounded border border-slate-100 p-2 text-xs hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800">
                    <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] capitalize ${e.event_type === "task_deadline" ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800"}`}>{e.event_type.replace(/_/g, " ")}</span>
                    <span className="min-w-0 flex-1 truncate">{e.title}</span>
                    <span className="shrink-0 text-slate-400">{e.all_day ? String(e.starts_at).slice(0, 10) : new Date(e.starts_at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-3 flex gap-2 text-xs">
            <Link href="/tasks" className="flex items-center gap-1 rounded-md border px-2 py-1 hover:bg-slate-50 dark:hover:bg-slate-800"><ListTodo className="h-3.5 w-3.5" />All tasks</Link>
            <Link href="/notes" className="flex items-center gap-1 rounded-md border px-2 py-1 hover:bg-slate-50 dark:hover:bg-slate-800"><StickyNote className="h-3.5 w-3.5" />Notes</Link>
            <Link href="/calendar" className="flex items-center gap-1 rounded-md border px-2 py-1 hover:bg-slate-50 dark:hover:bg-slate-800"><Calendar className="h-3.5 w-3.5" />Calendar</Link>
          </div>
        </section>
      </div>
    </div>
  );
}

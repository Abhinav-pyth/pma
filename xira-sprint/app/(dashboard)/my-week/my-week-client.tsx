"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format, parseISO, addWeeks, subWeeks } from "date-fns";
import { ChevronLeft, ChevronRight, LayoutGrid, List as ListIcon } from "lucide-react";
import { DndContext, PointerSensor, useSensor, useSensors, useDraggable, useDroppable, DragOverlay, type DragEndEvent } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/misc";
import { createClient } from "@/lib/supabase/client";

function PlanItem({ item }: { item: any }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: item.id, data: { item } });
  return (
    <div ref={setNodeRef} {...listeners} {...attributes} style={{ opacity: isDragging ? 0.3 : 1 }} className="cursor-grab rounded border border-slate-100 bg-white p-1.5 text-xs shadow-sm dark:border-slate-800 dark:bg-slate-800">
      <Link href={`/tasks/${item.task?.id}`} onClick={e => e.stopPropagation()} className="block truncate font-medium hover:underline">{item.task?.title}</Link>
      {item.task && <span className="text-[10px] text-slate-400">{item.task.sprints?.name ?? "no sprint"}{item.task.due_date ? ` · due ${item.task.due_date.slice(5)}` : ""}</span>}
    </div>
  );
}

function DayColumn({ day, items, isToday, highlight }: { day: string; items: any[]; isToday: boolean; highlight?: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: day });
  const done = items.filter(i => i.status === "completed" || i.task?.status === "done").length;
  return (
    <div ref={setNodeRef} className={cn("flex min-h-[120px] flex-col gap-1.5 rounded-lg border p-2", isToday ? "border-indigo-400 bg-indigo-50/60 dark:bg-indigo-950/40" : "border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/50", isOver && "ring-2 ring-indigo-400")}>
      <p className="flex items-center justify-between text-[11px] font-semibold uppercase text-slate-500">
        <Link href={`/my-day?date=${day}`} className="hover:underline">{format(parseISO(day), "EEE d")}</Link>
        <span>{done}/{items.length}</span>
      </p>
      {items.map((i: any) => <PlanItem key={i.id} item={i} />)}
    </div>
  );
}

export function MyWeekClient({ days, today, anchor, plans, overdue, userId, wsId }: any) {
  const router = useRouter();
  const [mode, setMode] = useState<"board" | "list">("board");
  const [activeDay, setActiveDay] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const planByDay: Record<string, any[]> = {};
  for (const d of days) planByDay[d] = [];
  for (const p of plans) (planByDay[p.plan_date] ||= []).push(...(p.daily_plan_tasks ?? []));

  async function onDragEnd(e: DragEndEvent) {
    setActiveDay(null);
    const item = e.active.data.current?.item;
    const to = e.over?.id as string | undefined;
    if (!item || !to || to === item._day) return;
    const supabase = createClient();
    // remove from old plan
    await supabase.from("daily_plan_tasks").delete().eq("id", item.id);
    // find or create target plan (unique per user+ws+date enforced in DB)
    const { data: tp, error: upErr } = await supabase.from("daily_plans")
      .upsert({ workspace_id: wsId, user_id: userId, plan_date: to }, { onConflict: "workspace_id,user_id,plan_date" })
      .select("id").single();
    if (upErr || !tp) return toast.error("Move failed — reverted");
    const { error } = await supabase.from("daily_plan_tasks").insert({ daily_plan_id: tp.id, task_id: item.task_id, position: 99 });
    if (error) return toast.error("Move failed — reverted");
    toast.success(`Moved to ${to}. Sprint association and due date preserved.`);
    router.refresh();
  }

  const a = parseISO(anchor);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button aria-label="Previous week" onClick={() => router.push(`/my-week?week=${format(subWeeks(a, 1), "yyyy-MM-dd")}`)} className="rounded-md border p-1.5 hover:bg-slate-50 dark:hover:bg-slate-800"><ChevronLeft className="h-4 w-4" /></button>
        <h1 className="text-lg font-semibold">Week of {format(parseISO(days[0]), "MMM d")} – {format(parseISO(days[6]), "MMM d, yyyy")}</h1>
        <button aria-label="Next week" onClick={() => router.push(`/my-week?week=${format(addWeeks(a, 1), "yyyy-MM-dd")}`)} className="rounded-md border p-1.5 hover:bg-slate-50 dark:hover:bg-slate-800"><ChevronRight className="h-4 w-4" /></button>
        {anchor !== today && <Link href="/my-week" className="text-xs text-indigo-600 hover:underline">This week</Link>}
        <div className="ml-auto flex overflow-hidden rounded-md border border-slate-300 dark:border-slate-700">
          <button aria-label="Calendar view" onClick={() => setMode("board")} className={cn("p-1.5", mode === "board" && "bg-indigo-600 text-white")}><LayoutGrid className="h-4 w-4" /></button>
          <button aria-label="List view" onClick={() => setMode("list")} className={cn("p-1.5", mode === "list" && "bg-indigo-600 text-white")}><ListIcon className="h-4 w-4" /></button>
        </div>
      </div>

      {overdue.length > 0 && (
        <section className="rounded-lg border border-red-200 bg-red-50/60 p-3 dark:border-red-900">
          <h2 className="mb-1 text-sm font-semibold text-red-700 dark:text-red-300">Overdue ({overdue.length})</h2>
          {overdue.map((t: any) => <Link key={t.id} href={`/tasks/${t.id}`} className="block truncate py-0.5 text-sm hover:underline">{t.title} <span className="text-xs text-red-500">· was due {t.due_date}</span></Link>)}
        </section>
      )}

      {mode === "board" ? (
        <DndContext sensors={sensors} onDragStart={e => setActiveDay((e.active.data.current?.item)?._day ?? null)} onDragEnd={onDragEnd}>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
            {days.map(d => <DayColumn key={d} day={d} items={(planByDay[d] ?? []).map((i: any) => ({ ...i, _day: d }))} isToday={d === today} />)}
          </div>
          <DragOverlay>{activeDay ? null : null}</DragOverlay>
        </DndContext>
      ) : (
        <div className="space-y-3">
          {days.map(d => {
            const items = planByDay[d] ?? [];
            return (
              <section key={d} className={cn("rounded-lg border p-3", d === today ? "border-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/30" : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900")}>
                <h2 className="mb-1.5 flex items-center justify-between text-sm font-semibold">
                  <Link href={`/my-day?date=${d}`} className="hover:underline">{format(parseISO(d), "EEEE, MMM d")}</Link>
                  <span className="text-xs font-normal text-slate-500">{items.filter((i: any) => i.status === "completed").length}/{items.length} done</span>
                </h2>
                {items.length === 0 ? <p className="text-xs text-slate-400">Nothing planned.</p> : items.map((i: any) => (
                  <div key={i.id} className="flex items-center gap-2 border-b border-slate-50 py-1 text-sm last:border-0 dark:border-slate-800">
                    <Link href={`/tasks/${i.task?.id}`} className={cn("min-w-0 flex-1 truncate hover:underline", i.status === "completed" && "line-through opacity-60")}>{i.task?.title}</Link>
                    {i.task && <StatusBadge status={i.task.status} />}
                  </div>
                ))}
              </section>
            );
          })}
          {Object.values(planByDay).every(v => v.length === 0) && <EmptyState title="A quiet week" description="Plan tasks from My Day or drag them between days in the board view." />}
        </div>
      )}
    </div>
  );
}

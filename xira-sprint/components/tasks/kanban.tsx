"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, useDraggable, useDroppable, type DragEndEvent } from "@dnd-kit/core";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { PriorityBadge } from "@/components/ui/badge";
import type { Task, TaskStatus } from "@/types/database";

const COLUMNS: { key: TaskStatus; label: string; cls: string }[] = [
  { key: "backlog", label: "Backlog", cls: "border-slate-300" },
  { key: "todo", label: "Todo", cls: "border-slate-400" },
  { key: "in_progress", label: "In Progress", cls: "border-blue-500" },
  { key: "in_review", label: "In Review", cls: "border-purple-500" },
  { key: "blocked", label: "Blocked", cls: "border-red-500" },
  { key: "done", label: "Done", cls: "border-green-500" },
];

function Card({ task, overlay }: { task: Task; overlay?: boolean }) {
  return (
    <div className={cn("rounded-md border border-slate-200 bg-white p-2.5 shadow-sm dark:border-slate-700 dark:bg-slate-800", overlay && "rotate-2 opacity-90")}>
      <Link href={`/tasks/${task.id}`} className="block text-sm font-medium leading-snug hover:text-indigo-600">{task.title}</Link>
      <div className="mt-1.5 flex items-center gap-2 text-xs text-slate-500">
        <PriorityBadge priority={task.priority} />
        <span className="truncate">{task.assignee?.full_name?.split(" ")[0] ?? "Unassigned"}</span>
        {task.due_date && <span className="ml-auto shrink-0">{task.due_date.slice(5)}</span>}
      </div>
    </div>
  );
}

function DraggableCard({ task }: { task: Task }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: task.id, data: { task } });
  return <div ref={setNodeRef} {...listeners} {...attributes} style={{ opacity: isDragging ? 0.3 : 1 }}><Card task={task} /></div>;
}

function Column({ col, tasks }: { col: typeof COLUMNS[number]; tasks: Task[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: col.key });
  return (
    <div className="flex min-w-[220px] flex-1 flex-col rounded-lg border-t-2 bg-slate-50/70 dark:bg-slate-900/60 p-2" style={{ borderTopColor: "currentColor" }}>
      <div ref={setNodeRef} className={cn("flex min-h-[120px] flex-1 flex-col gap-2 rounded p-1", isOver && "bg-indigo-50 ring-1 ring-indigo-300 dark:bg-indigo-950")}>
        <p className="flex items-center justify-between px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{col.label}<span>{tasks.length}</span></p>
        {tasks.map(t => <DraggableCard key={t.id} task={t} />)}
      </div>
    </div>
  );
}

export function KanbanBoard({ tasks }: { tasks: Task[] }) {
  const router = useRouter();
  const [active, setActive] = useState<Task | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  async function onDragEnd(e: DragEndEvent) {
    setActive(null);
    const task = e.active.data.current?.task as Task | undefined;
    const to = e.over?.id as TaskStatus | undefined;
    if (!task || !to || task.status === to) return;
    const supabase = createClient();
    const { error } = await supabase.from("tasks").update({ status: to }).eq("id", task.id);
    if (error) return toast.error("Move failed — reverted");
    router.refresh();
  }

  return (
    <DndContext sensors={sensors} onDragStart={e => setActive(e.active.data.current?.task as Task)} onDragEnd={onDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-4">
        {COLUMNS.map(col => <Column key={col.key} col={col} tasks={tasks.filter(t => t.status === col.key)} />)}
      </div>
      <DragOverlay>{active ? <Card task={active} overlay /> : null}</DragOverlay>
    </DndContext>
  );
}

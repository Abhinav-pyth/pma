import { cn } from "@/lib/utils";
import type { TaskStatus, TaskPriority } from "@/types/database";

export function Badge({ className, ...p }: React.HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium", className)} {...p} />;
}

const STATUS_META: Record<TaskStatus, { label: string; cls: string }> = {
  backlog: { label: "Backlog", cls: "bg-slate-100 text-slate-600 border-slate-200" },
  todo: { label: "Todo", cls: "bg-slate-100 text-slate-700 border-slate-300" },
  in_progress: { label: "In Progress", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  in_review: { label: "In Review", cls: "bg-purple-50 text-purple-700 border-purple-200" },
  blocked: { label: "Blocked", cls: "bg-red-50 text-red-700 border-red-200" },
  done: { label: "Done", cls: "bg-green-50 text-green-700 border-green-200" },
};
const PRIORITY_META: Record<TaskPriority, { label: string; cls: string }> = {
  low: { label: "Low", cls: "bg-slate-100 text-slate-600 border-slate-200" },
  medium: { label: "Medium", cls: "bg-sky-50 text-sky-700 border-sky-200" },
  high: { label: "High", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  urgent: { label: "Urgent", cls: "bg-red-50 text-red-700 border-red-200" },
};
export function StatusBadge({ status }: { status: TaskStatus }) {
  const m = STATUS_META[status];
  return <Badge className={m.cls}>{m.label}</Badge>;
}
export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  const m = PRIORITY_META[priority];
  return <Badge className={m.cls}>{m.label}</Badge>;
}
export { STATUS_META, PRIORITY_META };

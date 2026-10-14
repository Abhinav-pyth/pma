// Pure sprint calculations — safe to import from BOTH server components and
// client components. This module must never import next/headers or any
// server-only Supabase client.
import type { Sprint, Task } from "@/types/database";

export function sprintProgress(tasks: Task[]): {
  total: number;
  done: number;
  inProgress: number;
  blocked: number;
  open: number;
  pct: number;
  storyTotal: number;
  storyDone: number;
  remainingHours: number;
} {
  const total = tasks.length;
  const done = tasks.filter(t => t.status === "done").length;
  const inProgress = tasks.filter(t => t.status === "in_progress").length;
  const blocked = tasks.filter(t => t.status === "blocked").length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  const storyTotal = tasks.reduce((s, t) => s + (t.story_points ?? 0), 0);
  const storyDone = tasks.filter(t => t.status === "done").reduce((s, t) => s + (t.story_points ?? 0), 0);
  const remainingHours = tasks
    .filter(t => t.status !== "done")
    .reduce((s, t) => s + (Number(t.estimated_hours) || 0), 0);
  return { total, done, inProgress, blocked, open: total - done, pct, storyTotal, storyDone, remainingHours };
}

export function detectOverlappingActive(
  sprints: Sprint[],
  candidate: { start_date: string; end_date: string; project_id?: string | null; id?: string }
): Sprint[] {
  return sprints.filter(s =>
    s.id !== candidate.id &&
    s.status === "active" &&
    (!candidate.project_id || s.project_id === candidate.project_id) &&
    s.start_date <= candidate.end_date &&
    s.end_date >= candidate.start_date
  );
}

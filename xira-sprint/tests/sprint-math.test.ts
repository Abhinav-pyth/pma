import { describe, it, expect } from "vitest";
import { sprintProgress, detectOverlappingActive } from "@/lib/sprint-math";
import type { Task, Sprint } from "@/types/database";

function t(over: Partial<Task>): Task {
  return {
    id: Math.random().toString(36).slice(2),
    workspace_id: "ws", title: "t", description: null, project_id: null, sprint_id: null,
    assignee_id: null, creator_id: "u", status: "todo", priority: "medium", task_type: null,
    start_date: null, due_date: null, estimated_hours: null, story_points: null, labels: [],
    parent_task_id: null, completed_at: null, created_at: "", updated_at: "", ...over,
  } as Task;
}

describe("sprintProgress", () => {
  it("returns 0% for a sprint with zero tasks (edge case)", () => {
    const p = sprintProgress([]);
    expect(p.total).toBe(0);
    expect(p.pct).toBe(0);
    expect(p.done).toBe(0);
    expect(p.remainingHours).toBe(0);
  });

  it("computes completion percentage from real statuses", () => {
    const tasks = [
      t({ status: "done" }), t({ status: "done" }), t({ status: "in_progress" }),
      t({ status: "blocked" }), t({ status: "todo" }), t({ status: "backlog" }),
      t({ status: "in_review" }), t({ status: "todo" }),
    ];
    const p = sprintProgress(tasks);
    expect(p.total).toBe(8);
    expect(p.done).toBe(2);
    expect(p.inProgress).toBe(1);
    expect(p.blocked).toBe(1);
    expect(p.open).toBe(6);
    expect(p.pct).toBe(25); // 2/8 * 100
  });

  it("rounds percentages and sums story points / remaining effort", () => {
    const tasks = [
      t({ status: "done", story_points: 3, estimated_hours: 2 as any }),
      t({ status: "todo", story_points: 5, estimated_hours: 4 as any }),
      t({ status: "in_progress", story_points: null, estimated_hours: null }),
    ];
    const p = sprintProgress(tasks);
    expect(p.storyTotal).toBe(8);
    expect(p.storyDone).toBe(3);
    expect(p.remainingHours).toBe(4);
    expect(p.pct).toBe(33);
  });
});

describe("detectOverlappingActive", () => {
  const s = (over: Partial<Sprint>): Sprint =>
    ({ id: "s1", workspace_id: "ws", name: "S", goal: null, description: null, project_id: null,
       start_date: "2026-01-05", end_date: "2026-01-16", status: "active",
       created_at: "", updated_at: "", ...over } as Sprint);

  it("finds an active sprint whose range overlaps the candidate", () => {
    const list = [s({})];
    expect(detectOverlappingActive(list, { start_date: "2026-01-16", end_date: "2026-01-30" })).toHaveLength(1);
  });

  it("ignores non-active sprints and non-overlapping ranges", () => {
    const list = [s({ status: "planned" }), s({ id: "s2", start_date: "2026-02-01", end_date: "2026-02-12" })];
    expect(detectOverlappingActive(list, { start_date: "2026-01-10", end_date: "2026-01-20" })).toHaveLength(0);
  });

  it("excludes the candidate's own id when editing", () => {
    const list = [s({ id: "me" })];
    expect(detectOverlappingActive(list, { id: "me", start_date: "2026-01-10", end_date: "2026-01-20" })).toHaveLength(0);
  });

  it("scopes overlap detection to the same project when provided", () => {
    const list = [s({ project_id: "pA" })];
    expect(detectOverlappingActive(list, { start_date: "2026-01-10", end_date: "2026-01-20", project_id: "pB" })).toHaveLength(0);
    expect(detectOverlappingActive(list, { start_date: "2026-01-10", end_date: "2026-01-20", project_id: "pA" })).toHaveLength(1);
  });
});

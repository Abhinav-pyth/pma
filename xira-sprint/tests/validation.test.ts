import { describe, it, expect } from "vitest";
import { taskSchema, sprintSchema, eventSchema, scrumSchema, inviteSchema, signupSchema } from "@/lib/validation";

describe("taskSchema", () => {
  const base = { title: "Do it", status: "todo" as const, priority: "medium" as const };
  it("accepts a minimal valid task", () => {
    expect(taskSchema.safeParse(base).success).toBe(true);
  });
  it("rejects an empty title", () => {
    expect(taskSchema.safeParse({ ...base, title: "" }).success).toBe(false);
  });
  it("rejects invalid status/priority enums", () => {
    expect(taskSchema.safeParse({ ...base, status: "doing" }).success).toBe(false);
    expect(taskSchema.safeParse({ ...base, priority: "critical" }).success).toBe(false);
  });
  it("rejects a due date before the start date", () => {
    const r = taskSchema.safeParse({ ...base, start_date: "2026-03-10", due_date: "2026-03-05" });
    expect(r.success).toBe(false);
  });
});

describe("sprintSchema (invalid date ranges)", () => {
  const base = { name: "S1", start_date: "2026-03-02", end_date: "2026-03-13", status: "planned" as const };
  it("accepts a valid range", () => expect(sprintSchema.safeParse(base).success).toBe(true));
  it("rejects reversed dates", () =>
    expect(sprintSchema.safeParse({ ...base, start_date: "2026-03-13", end_date: "2026-03-02" }).success).toBe(false));
  it("requires both dates", () => {
    expect(sprintSchema.safeParse({ ...base, start_date: "" }).success).toBe(false);
    expect(sprintSchema.safeParse({ ...base, end_date: "" }).success).toBe(false);
  });
});

describe("eventSchema (invalid/reversed event dates)", () => {
  const base = { title: "Standup", event_type: "daily_scrum" as const, starts_at: "2026-03-18T09:00:00Z", ends_at: "2026-03-18T09:15:00Z" };
  it("accepts a forward-in-time event", () => expect(eventSchema.safeParse(base).success).toBe(true));
  it("rejects an event ending before it starts", () =>
    expect(eventSchema.safeParse({ ...base, ends_at: "2026-03-18T08:00:00Z" }).success).toBe(false));
});

describe("scrumSchema & inviteSchema", () => {
  it("requires yesterday and today text; blockers optional", () => {
    expect(scrumSchema.safeParse({ yesterday: "x", today: "y" }).success).toBe(true);
    expect(scrumSchema.safeParse({ yesterday: "", today: "y" }).success).toBe(false);
  });
  it("invite role cannot be owner (privilege safety)", () => {
    expect(inviteSchema.safeParse({ email: "a@b.co", role: "owner" }).success).toBe(false);
    expect(inviteSchema.safeParse({ email: "not-an-email", role: "member" }).success).toBe(false);
  });
  it("signup enforces password length", () => {
    expect(signupSchema.safeParse({ fullName: "Ada L", email: "a@b.co", password: "short" }).success).toBe(false);
    expect(signupSchema.safeParse({ fullName: "Ada L", email: "a@b.co", password: "longenoughpw" }).success).toBe(true);
  });
});

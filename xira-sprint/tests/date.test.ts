import { describe, it, expect } from "vitest";
import { todayInTz, weekRange, isOverdue, sprintDaysRemaining, isValidDateRange } from "@/lib/date";

describe("timezone handling", () => {
  it("computes 'today' per IANA timezone at a date boundary", () => {
    // 2026-03-14T23:30:00Z => already 2026-03-15 in Asia/Kolkata (+5:30), still 03-14 in NY
    const now = new Date("2026-03-14T23:30:00Z");
    expect(todayInTz("Asia/Kolkata", now)).toBe("2026-03-15");
    expect(todayInTz("America/New_York", now)).toBe("2026-03-14");
    expect(todayInTz("UTC", now)).toBe("2026-03-14");
  });

  it("falls back gracefully for an invalid timezone", () => {
    expect(todayInTz("Not/AZone", new Date("2026-01-01T12:00:00Z"))).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("weekRange (Monday-anchored)", () => {
  it("returns Monday..Sunday for a mid-week anchor", () => {
    const w = weekRange("2026-03-18"); // Wednesday
    expect(w.start).toBe("2026-03-16"); // Monday
    expect(w.end).toBe("2026-03-22");   // Sunday
    expect(w.days).toHaveLength(7);
    expect(w.days[0]).toBe("2026-03-16");
    expect(w.days[6]).toBe("2026-03-22");
  });

  it("keeps the same week when anchored exactly on Monday / Sunday", () => {
    expect(weekRange("2026-03-16").start).toBe("2026-03-16");
    expect(weekRange("2026-03-22").start).toBe("2026-03-16");
    expect(weekRange("2026-03-22").end).toBe("2026-03-22");
  });
});

describe("overdue & sprint-day boundaries", () => {
  it("tasks without due dates are never overdue", () => {
    expect(isOverdue(null, "2026-03-18")).toBe(false);
  });
  it("due yesterday is overdue; due today is not", () => {
    expect(isOverdue("2026-03-17", "2026-03-18")).toBe(true);
    expect(isOverdue("2026-03-18", "2026-03-18")).toBe(false);
  });
  it("sprint days remaining: end date counts as 0, past end clamps via caller", () => {
    expect(sprintDaysRemaining("2026-03-18", "2026-03-18")).toBe(0);
    expect(sprintDaysRemaining("2026-03-20", "2026-03-18")).toBe(2);
    expect(sprintDaysRemaining("2026-03-17", "2026-03-18")).toBe(-1);
  });
  it("validates sprint/event date ranges", () => {
    expect(isValidDateRange("2026-03-02", "2026-03-13")).toBe(true);
    expect(isValidDateRange("2026-03-02", "2026-03-02")).toBe(true); // same-day allowed
    expect(isValidDateRange("2026-03-13", "2026-03-02")).toBe(false); // reversed
    expect(isValidDateRange("", "2026-03-02")).toBe(false);
  });
});

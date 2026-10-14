import { format, parseISO, isBefore, addDays, startOfWeek, endOfWeek, differenceInCalendarDays } from "date-fns";

/** Today's date string (yyyy-MM-dd) in the given IANA timezone. */
export function todayInTz(tz: string = "Asia/Kolkata", now: Date = new Date()): string {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
    const y = parts.find(p => p.type === "year")!.value;
    const m = parts.find(p => p.type === "month")!.value;
    const d = parts.find(p => p.type === "day")!.value;
    return `${y}-${m}-${d}`;
  } catch {
    return format(now, "yyyy-MM-dd");
  }
}

export function fmtDate(dateStr: string | null | undefined, pattern = "EEE, MMM d"): string {
  if (!dateStr) return "—";
  return format(parseISO(dateStr), pattern);
}

export function isOverdue(dueDate: string | null, today: string): boolean {
  if (!dueDate) return false;
  return isBefore(parseISO(dueDate), parseISO(today));
}

export function weekRange(anchor: string, weekStartsOn: 0 | 1 = 1): { days: string[]; start: string; end: string } {
  const s = startOfWeek(parseISO(anchor), { weekStartsOn });
  const e = endOfWeek(parseISO(anchor), { weekStartsOn });
  const days: string[] = [];
  for (let i = 0; i < 7; i++) days.push(format(addDays(s, i), "yyyy-MM-dd"));
  return { days, start: format(s, "yyyy-MM-dd"), end: format(e, "yyyy-MM-dd") };
}

export function sprintDaysRemaining(endDate: string, today: string): number {
  return differenceInCalendarDays(parseISO(endDate), parseISO(today));
}

export function isValidDateRange(start: string, end: string): boolean {
  if (!start || !end) return false;
  return !isBefore(parseISO(end), parseISO(start));
}

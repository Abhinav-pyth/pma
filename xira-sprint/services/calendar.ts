import { createClient } from "@/lib/supabase/server";
import type { CalendarEvent } from "@/types/database";

export async function listEvents(wsId: string, fromISO: string, toISO: string): Promise<CalendarEvent[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("calendar_events")
    .select("*, calendar_event_attendees(*)")
    .eq("workspace_id", wsId).gte("starts_at", fromISO).lte("starts_at", toISO)
    .order("starts_at");
  if (error) throw error;
  return (data ?? []) as unknown as CalendarEvent[];
}

export async function createEvent(input: Partial<CalendarEvent> & { workspace_id: string; creator_id: string; title: string; starts_at: string; ends_at: string }, attendees: string[] = []) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("calendar_events").insert(input).select().single();
  if (error) throw error;
  if (attendees.length) {
    await supabase.from("calendar_event_attendees").insert(attendees.map(u => ({ event_id: (data as CalendarEvent).id, user_id: u })));
  }
  return data as CalendarEvent;
}

export async function updateEvent(id: string, patch: Partial<CalendarEvent>, attendees?: string[]) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("calendar_events").update(patch).eq("id", id).select().single();
  if (error) throw error;
  if (attendees) {
    await supabase.from("calendar_event_attendees").delete().eq("event_id", id);
    if (attendees.length) await supabase.from("calendar_event_attendees").insert(attendees.map(u => ({ event_id: id, user_id: u })));
  }
  return data as CalendarEvent;
}

export async function deleteEvent(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("calendar_events").delete().eq("id", id);
  if (error) throw error;
}

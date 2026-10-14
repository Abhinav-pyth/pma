import { z } from "zod";

export const loginSchema = z.object({ email: z.string().email("Enter a valid email"), password: z.string().min(1, "Password is required") });
export const signupSchema = z.object({ fullName: z.string().min(2, "Name must be at least 2 characters"), email: z.string().email(), password: z.string().min(8, "Password must be at least 8 characters") });
export const taskSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(20000).optional().nullable(),
  status: z.enum(["backlog","todo","in_progress","in_review","blocked","done"]),
  priority: z.enum(["low","medium","high","urgent"]),
  task_type: z.enum(["feature","bug","improvement","chore"]).nullable().optional(),
  assignee_id: z.string().uuid().nullable().optional(),
  project_id: z.string().uuid().nullable().optional(),
  sprint_id: z.string().uuid().nullable().optional(),
  start_date: z.string().nullable().optional(),
  due_date: z.string().nullable().optional(),
  estimated_hours: z.coerce.number().min(0).max(9999).nullable().optional(),
  story_points: z.coerce.number().int().min(0).max(1000).nullable().optional(),
  labels: z.array(z.string()).default([]),
}).refine(v => !v.start_date || !v.due_date || v.due_date >= v.start_date, { message: "Due date cannot be before start date", path: ["due_date"] });

export const sprintSchema = z.object({
  name: z.string().min(1, "Sprint name is required").max(120),
  goal: z.string().max(500).optional().nullable(),
  description: z.string().max(5000).optional().nullable(),
  start_date: z.string().min(1, "Start date is required"),
  end_date: z.string().min(1, "End date is required"),
  status: z.enum(["planned","active","completed"]),
  project_id: z.string().uuid().nullable().optional(),
}).refine(v => v.end_date >= v.start_date, { message: "End date must be on or after start date", path: ["end_date"] });

export const eventSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(10000).optional().nullable(),
  event_type: z.enum(["personal","team_meeting","sprint_planning","daily_scrum","sprint_review","sprint_retro","task_deadline","custom_reminder"]),
  starts_at: z.string().min(1),
  ends_at: z.string().min(1),
  all_day: z.boolean().default(false),
  project_id: z.string().uuid().nullable().optional(),
  sprint_id: z.string().uuid().nullable().optional(),
  task_id: z.string().uuid().nullable().optional(),
}).refine(v => new Date(v.ends_at) >= new Date(v.starts_at), { message: "End time must be after start time", path: ["ends_at"] });

export const scrumSchema = z.object({
  yesterday: z.string().min(1, "Tell us what you completed yesterday").max(5000),
  today: z.string().min(1, "Tell us your plan for today").max(5000),
  blockers: z.string().max(5000).default(""),
});

export const noteSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  content: z.string().max(50000).default(""),
  visibility: z.enum(["private","workspace"]).default("private"),
  pinned: z.boolean().default(false),
  tags: z.array(z.string()).default([]),
  task_id: z.string().uuid().nullable().optional(),
  sprint_id: z.string().uuid().nullable().optional(),
  project_id: z.string().uuid().nullable().optional(),
  calendar_event_id: z.string().uuid().nullable().optional(),
});

export const inviteSchema = z.object({ email: z.string().email("Enter a valid email"), role: z.enum(["admin","team_lead","member"]) });
export const workspaceSchema = z.object({ name: z.string().min(2, "Workspace name is required").max(80) });
export const profileSchema = z.object({ full_name: z.string().min(2).max(120), timezone: z.string().min(1) });

import type { WorkspaceRole } from "@/types/database";

export const ROLE_LEVEL: Record<WorkspaceRole, number> = { owner: 4, admin: 3, team_lead: 2, member: 1 };

export function hasRole(role: WorkspaceRole | null | undefined, min: WorkspaceRole): boolean {
  if (!role) return false;
  return ROLE_LEVEL[role] >= ROLE_LEVEL[min];
}

export function canManageSprints(role?: WorkspaceRole | null) { return hasRole(role, "team_lead"); }
export function canManageMembers(role?: WorkspaceRole | null) { return hasRole(role, "admin"); }
export function canManageWorkspace(role?: WorkspaceRole | null) { return hasRole(role, "admin"); }
export function canReviewScrum(role?: WorkspaceRole | null) { return hasRole(role, "team_lead"); }
export function canAssignTasks(role?: WorkspaceRole | null) { return hasRole(role, "member"); }
export function isOwner(role?: WorkspaceRole | null) { return role === "owner"; }

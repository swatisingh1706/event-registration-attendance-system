import type { Role } from "@prisma/client";

export type Permission =
  | "dashboard.view"
  | "events.view"
  | "events.manage"
  | "events.delete"
  | "participants.view"
  | "participants.export"
  | "attendance.view"
  | "checkin"
  | "partners.manage"
  | "reports.view"
  | "settings.manage"
  | "users.manage";

const STAFF: Permission[] = ["events.view", "attendance.view", "checkin"];
const ADMIN: Permission[] = [
  ...STAFF,
  "dashboard.view",
  "events.manage",
  "events.delete",
  "participants.view",
  "participants.export",
  "partners.manage",
  "reports.view",
  "settings.manage",
];

const MATRIX: Record<Role, Permission[]> = {
  PARTICIPANT: [],
  CHECKIN_STAFF: STAFF,
  ADMIN,
  SUPER_ADMIN: [...ADMIN, "users.manage"],
};

export function can(role: Role | undefined | null, permission: Permission): boolean {
  return !!role && MATRIX[role].includes(permission);
}

export function isStaffRole(role: Role | undefined | null): boolean {
  return !!role && role !== "PARTICIPANT";
}

export const ROLE_LABEL: Record<Role, string> = {
  PARTICIPANT: "Participant",
  CHECKIN_STAFF: "Check-in staff",
  ADMIN: "Admin",
  SUPER_ADMIN: "Super admin",
};

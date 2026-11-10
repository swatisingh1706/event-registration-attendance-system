import type { EventStatus } from "@prisma/client";
import { eventEnd, nowWall } from "@/lib/datetime";

export type RegistrationState = "OPEN" | "CLOSED" | "FULL" | "NOT_OPEN" | "ENDED" | "CANCELLED";

export type StateInput = {
  status: EventStatus;
  capacity: number;
  date: Date;
  endTime: string;
  registrationDeadline: Date | null;
};

/**
 * Single source of truth for "can people register for this event right now".
 * Used by the public pages *and* re-checked inside the registration transaction.
 * The registered count is always read from the database, never from the client.
 */
export function getRegistrationState(event: StateInput, registeredCount: number, now = nowWall()): RegistrationState {
  if (event.status === "CANCELLED") return "CANCELLED";
  // PUBLISHED = visible on the site but registration has not been opened yet.
  if (event.status === "DRAFT" || event.status === "PUBLISHED") return "NOT_OPEN";
  if (event.status === "COMPLETED" || eventEnd(event) < now) return "ENDED";
  if (event.status === "REGISTRATION_CLOSED") return "CLOSED";
  if (event.registrationDeadline && event.registrationDeadline < now) return "CLOSED";
  if (registeredCount >= event.capacity) return "FULL";
  return "OPEN";
}

export const STATUS_LABEL: Record<EventStatus, string> = {
  DRAFT: "Draft",
  PUBLISHED: "Published",
  REGISTRATION_OPEN: "Registration open",
  REGISTRATION_CLOSED: "Registration closed",
  FULL: "Full",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export const REG_STATE_LABEL: Record<RegistrationState, string> = {
  OPEN: "Registration open",
  CLOSED: "Registration closed",
  FULL: "Event full",
  NOT_OPEN: "Not yet open",
  ENDED: "Event ended",
  CANCELLED: "Cancelled",
};

export const CATEGORY_LABEL = {
  COMMUNITY: "Community",
  ENVIRONMENT: "Environment",
  EDUCATION: "Education",
  HEALTH_AWARENESS: "Health & Awareness",
  FOOD_DISTRIBUTION: "Food Distribution",
  VOLUNTEERING: "Volunteering",
  FUNDRAISING: "Fundraising",
  SKILL_DEVELOPMENT: "Skill Development",
  OTHER: "Other",
} as const;

export const PARTNER_TYPE_LABEL = {
  NGO: "NGO",
  COMPANY: "Company",
  EDUCATIONAL: "College / University",
  COMMUNITY: "Community organization",
  GOVERNMENT: "Government / community body",
} as const;

export const VOLUNTEER_INTERESTS = [
  "On-ground support",
  "Registration desk",
  "Logistics & setup",
  "Teaching & mentoring",
  "Photography & media",
  "First aid & health",
] as const;

/** Value of the registration form's volunteer select meaning "attending only". */
export const ATTENDEE_ONLY = "ATTENDEE_ONLY";

import { Prisma, type CheckInMethod, type Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { eventEnd, eventStart, formatDate, formatInstantTime, formatTime, nowWall } from "@/lib/datetime";
import { getSettings } from "@/lib/services/settings";
import { can } from "@/lib/permissions";

export type CheckInResult =
  | { status: "SUCCESS"; participant: string; eventTitle: string; registrationNumber: string; checkedInAt: string }
  | { status: "ALREADY_CHECKED_IN"; participant: string; eventTitle: string; registrationNumber: string; checkedInAt: string }
  | { status: "INVALID" }
  | { status: "WRONG_EVENT"; ticketEvent: string; currentEvent: string }
  | { status: "NOT_ACTIVE"; message: string }
  | { status: "OUTSIDE_WINDOW"; message: string }
  | { status: "CANCELLED_TICKET"; participant: string }
  | { status: "FORBIDDEN" }
  | { status: "EVENT_NOT_FOUND" };

export type CheckInRequest = {
  actor: { id: string; role: Role };
  /** The event the scanner is currently configured for. */
  eventId: string;
  /** QR token, or (manual mode) a registration number. */
  code: string;
  method: CheckInMethod;
};

/**
 * The one and only place attendance is created. Both the QR scanner endpoint and the
 * manual/admin check-in paths go through here, so every path gets identical validation.
 *
 * Concurrency: the check is "read then insert", but the insert is protected by the
 * UNIQUE index on Attendance.registrationId. If two scanners race, PostgreSQL lets
 * exactly one INSERT succeed; the other gets P2002 and is answered ALREADY_CHECKED_IN.
 */
export async function performCheckIn(req: CheckInRequest): Promise<CheckInResult> {
  // 1–2. Authenticated staff with check-in permission (re-verified even though callers check too).
  if (!can(req.actor.role, "checkin")) return { status: "FORBIDDEN" };

  const code = req.code.trim();
  const currentEvent = await prisma.event.findUnique({
    where: { id: req.eventId },
    select: { id: true, title: true, status: true, date: true, startTime: true, endTime: true },
  });
  if (!currentEvent) return { status: "EVENT_NOT_FOUND" };

  // 3–4. Ticket token → registration. QR scans match on the token only; manual entry may also use the registration number.
  const registration = await prisma.registration.findFirst({
    where: req.method === "QR_SCAN" ? { ticketToken: code } : { OR: [{ registrationNumber: code.toUpperCase() }, { ticketToken: code }] },
    include: { event: { select: { id: true, title: true, status: true } }, attendance: true },
  });
  if (!registration) return { status: "INVALID" };

  // 5–7 & 9. The ticket must belong to the event being checked in.
  if (registration.eventId !== currentEvent.id) {
    return { status: "WRONG_EVENT", ticketEvent: registration.event.title, currentEvent: currentEvent.title };
  }

  // Registration must still be valid.
  if (registration.status !== "REGISTERED") return { status: "CANCELLED_TICKET", participant: registration.fullName };

  // The event must be one that is actually running or about to run.
  if (["DRAFT", "CANCELLED", "COMPLETED"].includes(currentEvent.status)) {
    return {
      status: "NOT_ACTIVE",
      message:
        currentEvent.status === "CANCELLED"
          ? "This event has been cancelled."
          : currentEvent.status === "COMPLETED"
            ? "This event is marked as completed, so check-in is closed."
            : "This event is not published yet.",
    };
  }

  const shape = (checkedInAt: Date) => ({
    participant: registration.fullName,
    eventTitle: currentEvent.title,
    registrationNumber: registration.registrationNumber,
    checkedInAt: formatInstantTime(checkedInAt),
  });

  // 8 & 10. Already used?
  if (registration.attendance) return { status: "ALREADY_CHECKED_IN", ...shape(registration.attendance.checkedInAt) };

  // Check-in only runs around the event itself (window set in Admin → Settings; 0 = no limit).
  // A manual override by an admin is a deliberate decision, so it is exempt.
  if (req.method !== "ADMIN_OVERRIDE") {
    const hours = (await getSettings()).checkInWindowHours;
    if (hours > 0) {
      const now = nowWall().getTime();
      const opens = new Date(eventStart(currentEvent).getTime() - hours * 3600000);
      const closes = new Date(eventEnd(currentEvent).getTime() + hours * 3600000);
      const fmt = (d: Date) => `${formatDate(d)} at ${formatTime(d.toISOString().slice(11, 16))}`;
      if (now < opens.getTime()) return { status: "OUTSIDE_WINDOW", message: `Check-in for this event opens on ${fmt(opens)}.` };
      if (now > closes.getTime()) return { status: "OUTSIDE_WINDOW", message: `Check-in for this event closed on ${fmt(closes)}.` };
    }
  }

  try {
    const attendance = await prisma.attendance.create({
      data: {
        registrationId: registration.id,
        eventId: registration.eventId,
        checkedInById: req.actor.id,
        method: req.method,
      },
    });
    return { status: "SUCCESS", ...shape(attendance.checkedInAt) };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      // Lost a race with another scanner: the unique index did its job.
      const winner = await prisma.attendance.findUnique({ where: { registrationId: registration.id } });
      return { status: "ALREADY_CHECKED_IN", ...shape(winner?.checkedInAt ?? new Date()) };
    }
    throw e;
  }
}


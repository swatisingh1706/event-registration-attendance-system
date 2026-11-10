import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { nowWall } from "@/lib/datetime";
import { ATTENDEE_ONLY, getRegistrationState } from "@/lib/event-state";
import { formatRegistrationNumber, generateTicketToken } from "@/lib/qr";
import { syncCapacityStatus } from "@/lib/services/events";
import { getSettings } from "@/lib/services/settings";

export type RegisterInput = {
  fullName: string;
  email: string;
  phone: string;
  organization?: string;
  city?: string;
  volunteerInterest: string;
};

export type RegisterResult =
  | { ok: true; registrationId: string; registrationNumber: string }
  | { ok: false; code: "NOT_FOUND" | "CLOSED" | "FULL" | "ALREADY_REGISTERED" | "NOT_OPEN" | "ENDED" | "CANCELLED"; registrationId?: string };

/**
 * Creates a registration + ticket. The event row is locked (SELECT … FOR UPDATE)
 * for the duration of the transaction, so two people racing for the last seat are
 * serialised: exactly one wins and the other receives FULL. The database also
 * enforces @@unique([userId, eventId]) as a backstop against double registration.
 */
export async function registerForEvent(userId: string, eventId: string, input: RegisterInput): Promise<RegisterResult> {
  const settings = await getSettings();
  const isVolunteer = input.volunteerInterest !== ATTENDEE_ONLY;

  try {
    return await prisma.$transaction(
      async (tx): Promise<RegisterResult> => {
        await tx.$queryRaw`SELECT id FROM "Event" WHERE id = ${eventId} FOR UPDATE`;
        const event = await tx.event.findUnique({ where: { id: eventId } });
        if (!event) return { ok: false, code: "NOT_FOUND" };

        const existing = await tx.registration.findUnique({ where: { userId_eventId: { userId, eventId } } });
        if (existing?.status === "REGISTERED") {
          return { ok: false, code: "ALREADY_REGISTERED", registrationId: existing.id };
        }

        const registered = await tx.registration.count({ where: { eventId, status: "REGISTERED" } });
        const state = getRegistrationState(event, registered, nowWall());
        if (state !== "OPEN") {
          if (state === "FULL") await syncCapacityStatus(tx, eventId);
          return { ok: false, code: state };
        }

        const data = {
          fullName: input.fullName,
          email: input.email,
          phone: input.phone,
          organization: input.organization ?? null,
          city: input.city ?? null,
          volunteerInterest: isVolunteer ? input.volunteerInterest : null,
          isVolunteer,
          consentGiven: true,
          status: "REGISTERED" as const,
        };

        let registration;
        if (existing) {
          // Re-registering after a cancellation: issue a fresh ticket token so the old QR is dead.
          registration = await tx.registration.update({
            where: { id: existing.id },
            data: { ...data, ticketToken: generateTicketToken(settings.ticketPrefix), registeredAt: new Date() },
          });
        } else {
          const [{ nextval }] = await tx.$queryRaw<{ nextval: bigint }[]>`
            SELECT nextval(pg_get_serial_sequence('"Registration"', 'seq')) AS nextval`;
          const seq = Number(nextval);
          registration = await tx.registration.create({
            data: {
              userId,
              eventId,
              seq,
              ticketToken: generateTicketToken(settings.ticketPrefix),
              registrationNumber: formatRegistrationNumber(settings.ticketPrefix, seq, event.date.getUTCFullYear()),
              ...data,
            },
          });
        }

        await syncCapacityStatus(tx, eventId);
        return { ok: true, registrationId: registration.id, registrationNumber: registration.registrationNumber };
      },
      { timeout: 10000 },
    );
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      const existing = await prisma.registration.findUnique({ where: { userId_eventId: { userId, eventId } } });
      return { ok: false, code: "ALREADY_REGISTERED", registrationId: existing?.id };
    }
    throw e;
  }
}

export type CancelResult = { ok: true } | { ok: false; code: "NOT_FOUND" | "ATTENDED" | "ENDED" };

/** A participant (or admin) cancels a registration; frees the seat atomically. */
export async function cancelRegistration(registrationId: string, opts: { userId?: string }): Promise<CancelResult> {
  return prisma.$transaction(async (tx): Promise<CancelResult> => {
    const reg = await tx.registration.findUnique({
      where: { id: registrationId },
      include: { attendance: true, event: true },
    });
    if (!reg || reg.status !== "REGISTERED" || (opts.userId && reg.userId !== opts.userId)) {
      return { ok: false, code: "NOT_FOUND" };
    }
    if (reg.attendance) return { ok: false, code: "ATTENDED" };
    if (reg.event.status === "COMPLETED") return { ok: false, code: "ENDED" };
    await tx.$queryRaw`SELECT id FROM "Event" WHERE id = ${reg.eventId} FOR UPDATE`;
    await tx.registration.update({ where: { id: reg.id }, data: { status: "CANCELLED" } });
    await syncCapacityStatus(tx, reg.eventId);
    return { ok: true };
  });
}

export async function getUserRegistrations(userId: string) {
  return prisma.registration.findMany({
    where: { userId, status: "REGISTERED" },
    include: { event: true, attendance: true },
    orderBy: { event: { date: "asc" } },
  });
}

export type UserRegistration = Awaited<ReturnType<typeof getUserRegistrations>>[number];

/** Ownership-checked lookup: a participant can only ever load their own ticket. */
export async function getOwnTicket(userId: string, registrationId: string) {
  return prisma.registration.findFirst({
    where: { id: registrationId, userId },
    include: { event: true, attendance: true },
  });
}

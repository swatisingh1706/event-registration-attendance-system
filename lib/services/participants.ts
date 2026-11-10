import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export type ParticipantFilters = {
  q?: string;
  eventId?: string;
  attendance?: "all" | "present" | "absent";
  sort?: "registered" | "name" | "event" | "checkin";
  dir?: "asc" | "desc";
  page?: number;
};

export const PAGE_SIZE = 20;

function where(f: ParticipantFilters): Prisma.RegistrationWhereInput {
  const w: Prisma.RegistrationWhereInput = { status: "REGISTERED" };
  if (f.eventId) w.eventId = f.eventId;
  if (f.attendance === "present") w.attendance = { isNot: null };
  if (f.attendance === "absent") w.attendance = { is: null };
  if (f.q) {
    w.OR = [
      { fullName: { contains: f.q, mode: "insensitive" } },
      { email: { contains: f.q, mode: "insensitive" } },
      { registrationNumber: { contains: f.q, mode: "insensitive" } },
      { organization: { contains: f.q, mode: "insensitive" } },
    ];
  }
  return w;
}

function orderBy(f: ParticipantFilters): Prisma.RegistrationOrderByWithRelationInput[] {
  const dir = f.dir === "asc" ? "asc" : "desc";
  switch (f.sort) {
    case "name":
      return [{ fullName: dir }];
    case "event":
      return [{ event: { title: dir } }, { registeredAt: "desc" }];
    case "checkin":
      return [{ attendance: { checkedInAt: dir } }, { registeredAt: "desc" }];
    default:
      return [{ registeredAt: dir }];
  }
}

const include = {
  event: { select: { id: true, title: true, date: true } },
  attendance: { include: { checkedInBy: { select: { name: true } } } },
} satisfies Prisma.RegistrationInclude;

export async function listParticipants(f: ParticipantFilters) {
  const page = Math.max(1, f.page ?? 1);
  const w = where(f);
  const [total, rows] = await Promise.all([
    prisma.registration.count({ where: w }),
    prisma.registration.findMany({ where: w, orderBy: orderBy(f), include, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
  ]);
  return { total, rows, page, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export async function exportParticipants(f: ParticipantFilters) {
  return prisma.registration.findMany({ where: where(f), orderBy: orderBy(f), include, take: 20000 });
}

export async function listEventRoster(eventId: string) {
  const rows = await prisma.registration.findMany({
    where: { eventId, status: "REGISTERED" },
    orderBy: { fullName: "asc" },
    include: { attendance: { include: { checkedInBy: { select: { name: true } } } } },
  });
  // Most recent check-ins first, then everyone still to arrive (alphabetical).
  return rows.sort((a, b) => {
    if (a.attendance && b.attendance) return b.attendance.checkedInAt.getTime() - a.attendance.checkedInAt.getTime();
    if (a.attendance) return -1;
    if (b.attendance) return 1;
    return 0;
  });
}

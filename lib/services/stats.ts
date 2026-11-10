import { prisma } from "@/lib/db";
import { APP_TZ, durationHours, nowWall } from "@/lib/datetime";

const startOfToday = () => {
  const d = nowWall();
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

async function attendedHours(where: string): Promise<number> {
  // where is a fixed internal fragment, never user input.
  const rows = await prisma.$queryRawUnsafe<{ hours: number }[]>(`
    SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (e."endTime"::time - e."startTime"::time)) / 3600), 0)::float AS hours
    FROM "Attendance" a
    JOIN "Event" e ON e.id = a."eventId"
    JOIN "Registration" r ON r.id = a."registrationId"
    ${where}`);
  return Math.round(Number(rows[0]?.hours ?? 0));
}

/** Every number is computed from PostgreSQL on request. */
export async function getDashboardStats() {
  const today = startOfToday();
  const [totalEvents, upcomingEvents, totalRegistrations, totalAttendance, volunteers] = await Promise.all([
    prisma.event.count({ where: { status: { not: "DRAFT" } } }),
    prisma.event.count({ where: { status: { notIn: ["DRAFT", "CANCELLED", "COMPLETED"] }, date: { gte: today } } }),
    prisma.registration.count({ where: { status: "REGISTERED" } }),
    prisma.attendance.count({ where: { registration: { status: "REGISTERED" } } }),
    prisma.registration.findMany({ where: { status: "REGISTERED", isVolunteer: true }, distinct: ["userId"], select: { userId: true } }),
  ]);
  return {
    totalEvents,
    upcomingEvents,
    totalRegistrations,
    totalAttendance,
    attendanceRate: totalRegistrations ? (totalAttendance / totalRegistrations) * 100 : 0,
    activeVolunteers: volunteers.length,
  };
}

export async function getImpactStats() {
  const [eventsConducted, volunteers, participants, communityHours] = await Promise.all([
    prisma.event.count({ where: { status: "COMPLETED" } }),
    prisma.registration.findMany({ where: { status: "REGISTERED", isVolunteer: true }, distinct: ["userId"], select: { userId: true } }),
    prisma.registration.findMany({ where: { status: "REGISTERED" }, distinct: ["userId"], select: { userId: true } }),
    attendedHours(`WHERE r.status = 'REGISTERED'`),
  ]);
  return { eventsConducted, volunteers: volunteers.length, participants: participants.length, communityHours };
}

export async function getRegistrationTrend(days = 30) {
  const rows = await prisma.$queryRaw<{ day: string; count: number }[]>`
    SELECT to_char(("registeredAt" AT TIME ZONE ${APP_TZ})::date, 'YYYY-MM-DD') AS day, COUNT(*)::int AS count
    FROM "Registration"
    WHERE status = 'REGISTERED' AND "registeredAt" > now() - make_interval(days => ${days}::int)
    GROUP BY 1 ORDER BY 1`;
  // Fill missing days so the trend line is honest.
  const byDay = new Map(rows.map((r) => [r.day, Number(r.count)]));
  const out: { day: string; count: number }[] = [];
  const cursor = nowWall();
  cursor.setUTCDate(cursor.getUTCDate() - (days - 1));
  for (let i = 0; i < days; i++) {
    const key = cursor.toISOString().slice(0, 10);
    out.push({ day: key, count: byDay.get(key) ?? 0 });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return out;
}

export async function getAttendanceByEvent(limit = 8) {
  const events = await prisma.event.findMany({
    where: { status: { not: "DRAFT" } },
    orderBy: { date: "desc" },
    take: 40,
    select: {
      id: true,
      title: true,
      date: true,
      _count: { select: { registrations: { where: { status: "REGISTERED" } }, attendances: true } },
    },
  });
  return events
    .filter((e) => e._count.registrations > 0)
    .slice(0, limit)
    .reverse()
    .map((e) => ({ id: e.id, title: e.title, registered: e._count.registrations, attended: e._count.attendances }));
}

export async function getCategoryDistribution() {
  const rows = await prisma.event.groupBy({ by: ["category"], where: { status: { not: "DRAFT" } }, _count: { _all: true } });
  return rows.map((r) => ({ category: r.category, count: r._count._all })).sort((a, b) => b.count - a.count);
}

export async function getPartnerParticipation() {
  const partners = await prisma.partner.findMany({
    select: { id: true, name: true, _count: { select: { events: true } } },
  });
  return partners.map((p) => ({ id: p.id, name: p.name, events: p._count.events })).sort((a, b) => b.events - a.events);
}

export async function getEventAttendanceSummary(eventId: string) {
  const [registered, attended] = await Promise.all([
    prisma.registration.count({ where: { eventId, status: "REGISTERED" } }),
    prisma.attendance.count({ where: { eventId, registration: { status: "REGISTERED" } } }),
  ]);
  return { registered, attended, rate: registered ? (attended / registered) * 100 : 0 };
}

/** Participant-facing numbers for /portal. */
export async function getUserStats(userId: string) {
  const today = startOfToday();
  const [registered, attended, upcoming, hours] = await Promise.all([
    prisma.registration.count({ where: { userId, status: "REGISTERED" } }),
    prisma.attendance.count({ where: { registration: { userId, status: "REGISTERED" } } }),
    prisma.registration.count({ where: { userId, status: "REGISTERED", event: { date: { gte: today }, status: { notIn: ["CANCELLED", "COMPLETED"] } } } }),
    attendedHoursForUser(userId),
  ]);
  return { registered, attended, upcoming, volunteerHours: hours };
}

async function attendedHoursForUser(userId: string) {
  const rows = await prisma.attendance.findMany({
    where: { registration: { userId, status: "REGISTERED", isVolunteer: true } },
    select: { event: { select: { startTime: true, endTime: true } } },
  });
  return Math.round(rows.reduce((sum, r) => sum + durationHours(r.event.startTime, r.event.endTime), 0) * 10) / 10;
}

/** Check-ins per day (NGO timezone) for the last `days` days, with empty days filled in. */
export async function getAttendanceTrend(days = 30) {
  const rows = await prisma.$queryRaw<{ day: string; count: number }[]>`
    SELECT to_char(("checkedInAt" AT TIME ZONE ${APP_TZ})::date, 'YYYY-MM-DD') AS day, COUNT(*)::int AS count
    FROM "Attendance"
    WHERE "checkedInAt" > now() - make_interval(days => ${days}::int)
    GROUP BY 1 ORDER BY 1`;
  const byDay = new Map(rows.map((r) => [r.day, Number(r.count)]));
  const out: { day: string; count: number }[] = [];
  const cursor = nowWall();
  cursor.setUTCDate(cursor.getUTCDate() - (days - 1));
  for (let i = 0; i < days; i++) {
    const key = cursor.toISOString().slice(0, 10);
    out.push({ day: key, count: byDay.get(key) ?? 0 });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return out;
}

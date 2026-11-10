import { Prisma, type EventCategory } from "@prisma/client";
import { prisma } from "@/lib/db";
import { durationHours } from "@/lib/datetime";

export type ReportFilters = {
  eventId?: string;
  category?: string;
  partnerId?: string;
  sdg?: string;
  from?: string;
  to?: string;
};

const CATS = ["COMMUNITY", "ENVIRONMENT", "EDUCATION", "HEALTH_AWARENESS", "FOOD_DISTRIBUTION", "VOLUNTEERING", "FUNDRAISING", "SKILL_DEVELOPMENT", "OTHER"];
const isDate = (s?: string) => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);

export function reportWhere(f: ReportFilters): Prisma.EventWhereInput {
  const where: Prisma.EventWhereInput = { status: { notIn: ["DRAFT", "CANCELLED"] } };
  if (f.eventId) where.id = f.eventId;
  if (f.category && CATS.includes(f.category)) where.category = f.category as EventCategory;
  if (f.partnerId) where.partners = { some: { partnerId: f.partnerId } };
  if (f.sdg && Number(f.sdg)) where.sdgs = { some: { sdg: { number: Number(f.sdg) } } };
  if (isDate(f.from) || isDate(f.to)) {
    where.date = {
      ...(isDate(f.from) ? { gte: new Date(`${f.from}T00:00:00Z`) } : {}),
      ...(isDate(f.to) ? { lte: new Date(`${f.to}T00:00:00Z`) } : {}),
    };
  }
  return where;
}

const pct = (a: number, b: number) => (b ? (a / b) * 100 : 0);

export async function getReport(filters: ReportFilters) {
  const events = await prisma.event.findMany({
    where: reportWhere(filters),
    orderBy: { date: "desc" },
    select: {
      id: true,
      title: true,
      date: true,
      category: true,
      status: true,
      startTime: true,
      endTime: true,
      partners: { select: { partner: { select: { id: true, name: true } } } },
      sdgs: { select: { sdg: { select: { number: true, title: true } } } },
      registrations: {
        where: { status: "REGISTERED" },
        select: { userId: true, isVolunteer: true, attendance: { select: { id: true } } },
      },
    },
  });

  const rows = events.map((e) => {
    const registered = e.registrations.length;
    const attended = e.registrations.filter((r) => r.attendance).length;
    const hours = attended * durationHours(e.startTime, e.endTime);
    const volunteerHours =
      e.registrations.filter((r) => r.attendance && r.isVolunteer).length * durationHours(e.startTime, e.endTime);
    return {
      id: e.id,
      title: e.title,
      date: e.date,
      category: e.category,
      status: e.status,
      registered,
      attended,
      rate: pct(attended, registered),
      hours,
      volunteerHours,
      volunteers: new Set(e.registrations.filter((r) => r.isVolunteer).map((r) => r.userId)),
      partners: e.partners.map((p) => p.partner),
      sdgs: e.sdgs.map((s) => s.sdg),
    };
  });

  const registered = rows.reduce((s, r) => s + r.registered, 0);
  const attended = rows.reduce((s, r) => s + r.attended, 0);
  const allVolunteers = new Set<string>();
  rows.forEach((r) => r.volunteers.forEach((v) => allVolunteers.add(v)));

  const partnerMap = new Map<string, { id: string; name: string; events: number; registered: number; attended: number }>();
  const sdgMap = new Map<number, { number: number; title: string; events: number; registered: number; attended: number }>();
  for (const r of rows) {
    for (const p of r.partners) {
      const cur = partnerMap.get(p.id) ?? { id: p.id, name: p.name, events: 0, registered: 0, attended: 0 };
      cur.events++;
      cur.registered += r.registered;
      cur.attended += r.attended;
      partnerMap.set(p.id, cur);
    }
    for (const s of r.sdgs) {
      const cur = sdgMap.get(s.number) ?? { number: s.number, title: s.title, events: 0, registered: 0, attended: 0 };
      cur.events++;
      cur.registered += r.registered;
      cur.attended += r.attended;
      sdgMap.set(s.number, cur);
    }
  }

  return {
    summary: {
      events: rows.length,
      registered,
      attended,
      rate: pct(attended, registered),
      volunteers: allVolunteers.size,
      volunteerHours: Math.round(rows.reduce((s, r) => s + r.volunteerHours, 0)),
      communityHours: Math.round(rows.reduce((s, r) => s + r.hours, 0)),
    },
    rows,
    partners: [...partnerMap.values()].sort((a, b) => b.events - a.events),
    sdgs: [...sdgMap.values()].sort((a, b) => a.number - b.number),
  };
}

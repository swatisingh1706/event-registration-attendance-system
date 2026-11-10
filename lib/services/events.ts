import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { nowWall } from "@/lib/datetime";
import { getRegistrationState } from "@/lib/event-state";

type Tx = Prisma.TransactionClient;

const REGISTERED = { status: "REGISTERED" } as const;

export const publicEventInclude = {
  partners: { include: { partner: true } },
  sdgs: { include: { sdg: true }, orderBy: { sdg: { number: "asc" } } },
  _count: { select: { registrations: { where: REGISTERED }, attendances: true } },
} satisfies Prisma.EventInclude;

export type PublicEvent = Prisma.EventGetPayload<{ include: typeof publicEventInclude }>;

export function withState(event: PublicEvent) {
  const registered = event._count.registrations;
  return {
    ...event,
    registered,
    remaining: Math.max(0, event.capacity - registered),
    state: getRegistrationState(event, registered),
  };
}

export type EventView = ReturnType<typeof withState>;

export type EventFilters = {
  q?: string;
  category?: string;
  sdg?: string;
  when?: "upcoming" | "past" | "all";
};

/** Public catalogue: every event that has left DRAFT. */
export async function listPublicEvents(filters: EventFilters = {}, take = 60): Promise<EventView[]> {
  const today = nowWall();
  today.setUTCHours(0, 0, 0, 0);
  const where: Prisma.EventWhereInput = { status: { not: "DRAFT" } };
  if (filters.q) {
    where.OR = [
      { title: { contains: filters.q, mode: "insensitive" } },
      { location: { contains: filters.q, mode: "insensitive" } },
      { description: { contains: filters.q, mode: "insensitive" } },
    ];
  }
  if (filters.category && filters.category in CATEGORY_KEYS) where.category = filters.category as Prisma.EnumEventCategoryFilter["equals"];
  if (filters.sdg) where.sdgs = { some: { sdg: { number: Number(filters.sdg) || -1 } } };
  const when = filters.when ?? "upcoming";
  if (when === "upcoming") where.date = { gte: today };
  if (when === "past") where.date = { lt: today };

  const events = await prisma.event.findMany({
    where,
    include: publicEventInclude,
    orderBy: { date: when === "past" ? "desc" : "asc" },
    take,
  });
  return events.map(withState);
}

const CATEGORY_KEYS: Record<string, true> = {
  COMMUNITY: true,
  ENVIRONMENT: true,
  EDUCATION: true,
  HEALTH_AWARENESS: true,
  FOOD_DISTRIBUTION: true,
  VOLUNTEERING: true,
  FUNDRAISING: true,
  SKILL_DEVELOPMENT: true,
  OTHER: true,
};

export async function getPublicEvent(slug: string): Promise<EventView | null> {
  const event = await prisma.event.findFirst({
    where: { slug, status: { not: "DRAFT" } },
    include: publicEventInclude,
  });
  return event ? withState(event) : null;
}

export type AgendaItem = { time: string; title: string; description?: string };

export function parseAgenda(value: Prisma.JsonValue): AgendaItem[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((v) => {
    if (v && typeof v === "object" && !Array.isArray(v) && typeof v.title === "string") {
      return [{ time: String(v.time ?? ""), title: v.title, description: v.description ? String(v.description) : undefined }];
    }
    return [];
  });
}

export function slugify(text: string) {
  return (
    text
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^\w\s-]/g, "")
      .trim()
      .replace(/[\s_-]+/g, "-")
      .slice(0, 70) || "event"
  );
}

export async function uniqueSlug(title: string, ignoreId?: string) {
  const base = slugify(title);
  let slug = base;
  for (let i = 2; ; i++) {
    const clash = await prisma.event.findUnique({ where: { slug }, select: { id: true } });
    if (!clash || clash.id === ignoreId) return slug;
    slug = `${base}-${i}`;
  }
}

/**
 * Keeps the stored FULL status consistent with the real registration count.
 * Must run inside the same transaction that changed the count / capacity.
 */
export async function syncCapacityStatus(tx: Tx, eventId: string) {
  const event = await tx.event.findUnique({ where: { id: eventId }, select: { status: true, capacity: true } });
  if (!event) return;
  const registered = await tx.registration.count({ where: { eventId, ...REGISTERED } });
  if (event.status === "REGISTRATION_OPEN" && registered >= event.capacity) {
    await tx.event.update({ where: { id: eventId }, data: { status: "FULL" } });
  } else if (event.status === "FULL" && registered < event.capacity) {
    await tx.event.update({ where: { id: eventId }, data: { status: "REGISTRATION_OPEN" } });
  }
}

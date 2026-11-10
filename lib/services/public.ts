import { prisma } from "@/lib/db";

export function getPublicPartners() {
  return prisma.partner.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { events: true } } } });
}

/** SDGs that at least one published event is mapped to, with how many events support each. */
export async function getSdgFocus() {
  const goals = await prisma.sDGGoal.findMany({
    orderBy: { number: "asc" },
    include: { _count: { select: { events: { where: { event: { status: { not: "DRAFT" } } } } } } },
  });
  return goals.map((g) => ({ id: g.id, number: g.number, title: g.title, description: g.description, events: g._count.events }));
}

export function getSdgOptions() {
  return prisma.sDGGoal.findMany({ orderBy: { number: "asc" } });
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { updateEventAction } from "@/app/actions/admin";
import { EventForm } from "@/components/admin/event-form";
import { Notice, StatusBadge, flashParams } from "@/components/ui/server";
import { requirePermission } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { toDateInput, toDateTimeInput } from "@/lib/datetime";
import { parseAgenda } from "@/lib/services/events";
import { getSdgOptions } from "@/lib/services/public";

export const metadata: Metadata = { title: "Edit event" };

export default async function EditEventPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ notice?: string; error?: string }> }) {
  const { id } = await params;
  await requirePermission("events.manage", `/admin/events/${id}/edit`);
  const flash = flashParams(await searchParams);
  const [event, partners, sdgs] = await Promise.all([
    prisma.event.findUnique({ where: { id }, include: { partners: true, sdgs: true } }),
    prisma.partner.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    getSdgOptions(),
  ]);
  if (!event) notFound();

  return (
    <div className="max-w-3xl">
      <Link href="/admin/events" className="text-sm font-semibold text-forest hover:underline">← Events</Link>
      <div className="mb-8 mt-2 flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-semibold leading-tight">Edit event</h1>
        <StatusBadge status={event.status} />
        {event.status !== "DRAFT" && <Link href={`/events/${event.slug}`} target="_blank" className="text-sm font-semibold text-forest hover:underline">View public page ↗</Link>}
        <Link href={`/admin/events/${event.id}/attendance`} className="text-sm font-semibold text-forest hover:underline">Attendance</Link>
      </div>
      <Notice {...flash} />
      <EventForm
        mode="edit"
        action={updateEventAction.bind(null, event.id)}
        partners={partners}
        sdgs={sdgs}
        values={{
          title: event.title, description: event.description, coverImage: event.coverImage ?? "", category: event.category,
          date: toDateInput(event.date), startTime: event.startTime, endTime: event.endTime, location: event.location, address: event.address ?? "",
          capacity: event.capacity, registrationDeadline: event.registrationDeadline ? toDateTimeInput(event.registrationDeadline) : "",
          status: event.status, organizer: event.organizer, contactEmail: event.contactEmail ?? "", contactPhone: event.contactPhone ?? "",
          volunteerRequirements: event.volunteerRequirements ?? "", agenda: parseAgenda(event.agenda),
          partnerIds: event.partners.map((p) => p.partnerId), sdgIds: event.sdgs.map((s) => s.sdgId),
        }}
      />
    </div>
  );
}

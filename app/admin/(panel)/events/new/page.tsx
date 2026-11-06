import type { Metadata } from "next";
import Link from "next/link";
import { createEventAction } from "@/app/actions/admin";
import { EventForm } from "@/components/admin/event-form";
import { requirePermission } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/services/settings";
import { getSdgOptions } from "@/lib/services/public";

export const metadata: Metadata = { title: "New event" };

export default async function NewEventPage() {
  await requirePermission("events.manage", "/admin/events/new");
  const [settings, partners, sdgs] = await Promise.all([getSettings(), prisma.partner.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }), getSdgOptions()]);
  return (
    <div className="max-w-3xl">
      <Link href="/admin/events" className="text-sm font-semibold text-forest hover:underline">← Events</Link>
      <h1 className="mb-8 mt-2 text-2xl font-semibold tracking-tight">Create event</h1>
      <EventForm
        mode="create"
        action={createEventAction}
        partners={partners}
        sdgs={sdgs}
        values={{
          title: "", description: "", coverImage: "", category: "COMMUNITY", date: "", startTime: "09:00", endTime: "12:00", location: "", address: "",
          capacity: 100, registrationDeadline: "", status: "DRAFT", organizer: settings.name, contactEmail: settings.contactEmail ?? "",
          contactPhone: settings.contactPhone ?? "", volunteerRequirements: "", agenda: [], partnerIds: [], sdgIds: [],
        }}
      />
    </div>
  );
}

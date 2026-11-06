import type { Metadata } from "next";
import Link from "next/link";
import type { EventStatus } from "@prisma/client";
import {
  cancelEventAction,
  closeRegistrationAction,
  completeEventAction,
  deleteEventAction,
  duplicateEventAction,
  reopenRegistrationAction,
} from "@/app/actions/admin";
import { ActionForm, ConfirmButton } from "@/components/ui/client";
import { EmptyState, Notice, StatusBadge, flashParams } from "@/components/ui/server";
import { requirePermission } from "@/lib/auth/session";
import { can } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { formatDate, formatTime } from "@/lib/datetime";
import { STATUS_LABEL } from "@/lib/event-state";

export const metadata: Metadata = { title: "Events" };

export default async function AdminEvents({ searchParams }: { searchParams: Promise<{ notice?: string; error?: string; status?: string }> }) {
  const user = await requirePermission("events.manage", "/admin/events");
  const sp = await searchParams;
  const flash = flashParams(sp);
  const status = sp.status && sp.status in STATUS_LABEL ? (sp.status as EventStatus) : undefined;

  const events = await prisma.event.findMany({
    where: status ? { status } : undefined,
    orderBy: { date: "desc" },
    include: { _count: { select: { registrations: { where: { status: "REGISTERED" } }, attendances: true } } },
  });

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold leading-tight">Events</h1>
          <p className="text-muted">Create, publish and run your events.</p>
        </div>
        <Link href="/admin/events/new" className="btn-primary">New event</Link>
      </header>
      <Notice {...flash} />

      <nav aria-label="Filter by status" className="mb-4 flex flex-wrap gap-2 text-sm">
        <Link href="/admin/events" className="chip" aria-current={!status ? "true" : undefined}>All</Link>
        {(Object.keys(STATUS_LABEL) as EventStatus[]).map((s) => (
          <Link key={s} href={`/admin/events?status=${s}`} className="chip" aria-current={status === s ? "true" : undefined}>
            {STATUS_LABEL[s]}
          </Link>
        ))}
      </nav>

      {events.length ? (
        <div className="table-wrap">
          <table className="w-full">
            <thead>
              <tr>
                <th className="th" scope="col">Event</th>
                <th className="th" scope="col">Date</th>
                <th className="th" scope="col">Registrations</th>
                <th className="th" scope="col">Capacity</th>
                <th className="th" scope="col">Attendance</th>
                <th className="th" scope="col">Status</th>
                <th className="th" scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e) => {
                const open = e.status === "REGISTRATION_OPEN" || e.status === "FULL" || e.status === "PUBLISHED";
                const finished = e.status === "COMPLETED" || e.status === "CANCELLED";
                const fields = { eventId: e.id };
                return (
                  <tr key={e.id}>
                    <td className="td">
                      <Link href={`/admin/events/${e.id}/edit`} className="font-semibold hover:text-forest">{e.title}</Link>
                      <p className="text-xs text-muted">{e.location}{e.status !== "DRAFT" && <> · <Link href={`/events/${e.slug}`} target="_blank" className="whitespace-nowrap font-semibold text-forest hover:underline">Public page ↗</Link></>}{e.status === "DRAFT" && " · Private draft"}</p>
                    </td>
                    <td className="td whitespace-nowrap">{formatDate(e.date, { short: true })}<p className="text-xs text-muted">{formatTime(e.startTime)}</p></td>
                    <td className="td tabular-nums">{e._count.registrations}</td>
                    <td className="td tabular-nums">{e.capacity}</td>
                    <td className="td tabular-nums">{e._count.attendances}</td>
                    <td className="td"><StatusBadge status={e.status} /></td>
                    <td className="td">
                      <div className="flex items-center gap-1">
                        <Link href={`/admin/events/${e.id}/attendance`} className="btn-ghost btn-sm">Attendance</Link>
                        <Link href={`/admin/events/${e.id}/edit`} className="btn-ghost btn-sm">Edit</Link>
                        <details className="relative">
                          <summary className="btn-ghost btn-sm cursor-pointer list-none" aria-label={`More actions for ${e.title}`}>More ▾</summary>
                          <div className="mt-1 flex w-52 flex-col rounded-xl border border-line bg-white p-1.5">
                            {e.status !== "DRAFT" && <Link href={`/events/${e.slug}`} className="btn-ghost btn-sm justify-start" target="_blank">View public page</Link>}
                            <ActionForm action={duplicateEventAction}>
                              <input type="hidden" name="eventId" value={e.id} />
                              <button className="btn-ghost btn-sm w-full justify-start">Duplicate</button>
                            </ActionForm>
                            {open && !finished && e.status !== "PUBLISHED" && (
                              <ConfirmButton action={closeRegistrationAction} fields={fields} label="Close registration" title="Close registration?" message="No one else will be able to register. Existing tickets stay valid." confirmLabel="Close registration" triggerClass="btn-ghost btn-sm w-full justify-start" />
                            )}
                            {e.status === "REGISTRATION_CLOSED" && (
                              <ConfirmButton action={reopenRegistrationAction} fields={fields} label="Reopen registration" title="Reopen registration?" message="The event will accept registrations again while seats remain." confirmLabel="Reopen" triggerClass="btn-ghost btn-sm w-full justify-start" />
                            )}
                            {!finished && e.status !== "DRAFT" && (
                              <ConfirmButton action={completeEventAction} fields={fields} label="Mark completed" title="Mark this event as completed?" message="Registration and check-in will close. You can still view attendance and reports." confirmLabel="Mark completed" triggerClass="btn-ghost btn-sm w-full justify-start" />
                            )}
                            {!finished && (
                              <ConfirmButton action={cancelEventAction} fields={fields} label="Cancel event" title="Cancel this event?" message="The event will show as cancelled and check-in will be disabled. Registrations are kept for your records." confirmLabel="Cancel event" danger triggerClass="btn-ghost btn-sm w-full justify-start !text-danger" />
                            )}
                            {can(user.role, "events.delete") && e._count.registrations === 0 && (
                              <ConfirmButton action={deleteEventAction} fields={fields} label="Delete" title="Delete this event?" message="This permanently removes the event. It has no registrations, so nothing else is affected." confirmLabel="Delete event" danger triggerClass="btn-ghost btn-sm w-full justify-start !text-danger" />
                            )}
                          </div>
                        </details>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState icon="calendar" title="No events yet" action={{ href: "/admin/events/new", label: "Create your first event" }}>
          Events you create will appear here.
        </EmptyState>
      )}
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { manualCheckInAction } from "@/app/actions/admin";
import { AutoRefresh } from "@/components/admin/auto-refresh";
import { ConfirmButton } from "@/components/ui/client";
import { AttendanceStatus, Avatar, EmptyState, Notice, flashParams } from "@/components/ui/server";
import { requirePermission } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { formatDate, formatInstantDateTime } from "@/lib/datetime";
import { can } from "@/lib/permissions";
import { listEventRoster } from "@/lib/services/participants";
import { getEventAttendanceSummary } from "@/lib/services/stats";

export const metadata: Metadata = { title: "Event attendance" };

export default async function EventAttendancePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ notice?: string; error?: string; filter?: string }> }) {
  const { id } = await params;
  const user = await requirePermission("attendance.view", `/admin/events/${id}/attendance`);
  const sp = await searchParams;
  const flash = flashParams(sp);
  const event = await prisma.event.findUnique({ where: { id }, select: { id: true, title: true, date: true, status: true } });
  if (!event) notFound();

  const [summary, roster] = await Promise.all([getEventAttendanceSummary(id), listEventRoster(id)]);
  const filter = sp.filter === "present" || sp.filter === "absent" ? sp.filter : "all";
  const rows = roster.filter((r) => (filter === "present" ? r.attendance : filter === "absent" ? !r.attendance : true));
  const canCheckIn = can(user.role, "checkin") && !["DRAFT", "CANCELLED", "COMPLETED"].includes(event.status);

  return (
    <div>
      <Link href="/admin/attendance" className="text-sm font-semibold text-forest hover:underline">← Attendance</Link>
      <header className="mb-8 mt-2 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold leading-tight">{event.title}</h1>
          <p className="text-muted">{formatDate(event.date)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {can(user.role, "participants.export") && (
            <>
              <a href={`/api/export/participants?event=${event.id}&format=xlsx`} className="btn-secondary">Export Excel</a>
              <a href={`/api/export/participants?event=${event.id}`} className="btn-secondary">Export CSV</a>
            </>
          )}
          {can(user.role, "checkin") && <Link href={`/admin/scanner?event=${event.id}`} className="btn-primary">Open scanner for this event</Link>}
        </div>
      </header>
      <Notice {...flash} />

      <dl className="mb-6 grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-line bg-line">
        {[
          { l: "Registered", v: summary.registered },
          { l: "Attended", v: summary.attended },
          { l: "Attendance", v: `${summary.rate.toFixed(1)}%` },
        ].map((t) => (
          <div key={t.l} className="bg-white px-5 py-5">
            <dd className="text-2xl font-semibold tabular-nums text-forest-dark">{t.v}</dd>
            <dt className="mt-1 text-xs font-semibold uppercase tracking-wider text-muted">{t.l}</dt>
          </div>
        ))}
      </dl>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Filter participants" className="flex gap-2 text-sm">
          {[["all", "Everyone"], ["present", "Present"], ["absent", "Not checked in"]].map(([k, l]) => (
            <Link key={k} href={`/admin/events/${id}/attendance${k === "all" ? "" : `?filter=${k}`}`} className="chip" aria-current={filter === k ? "true" : undefined}>{l}</Link>
          ))}
        </nav>
        <AutoRefresh />
      </div>

      {rows.length ? (
        <div className="table-wrap">
          <table className="w-full">
            <thead>
              <tr>
                <th className="th" scope="col">Participant</th>
                <th className="th" scope="col">Registration ID</th>
                <th className="th" scope="col">Status</th>
                <th className="th" scope="col">Check-in time</th>
                <th className="th" scope="col">Checked in by</th>
                {canCheckIn && <th className="th" scope="col"><span className="sr-only">Action</span></th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="td"><div className="flex items-center gap-3"><Avatar name={r.fullName} /><div className="min-w-0"><p className="font-medium">{r.fullName}</p><p className="text-xs text-muted">{r.email}</p></div></div></td>
                  <td className="td font-mono text-xs">{r.registrationNumber}</td>
                  <td className="td">
                    <AttendanceStatus present={!!r.attendance} />
                  </td>
                  <td className="td whitespace-nowrap">{r.attendance ? formatInstantDateTime(r.attendance.checkedInAt) : "—"}</td>
                  <td className="td">{r.attendance ? (r.attendance.checkedInBy?.name ?? "—") : "—"}{r.attendance && r.attendance.method !== "QR_SCAN" && <span className="ml-1 text-xs text-muted">({r.attendance.method === "MANUAL_ID" ? "manual ID" : "manual"})</span>}</td>
                  {canCheckIn && (
                    <td className="td text-right">
                      {!r.attendance && (
                        <ConfirmButton
                          action={manualCheckInAction}
                          fields={{ registrationId: r.id, eventId: id }}
                          label="Check in"
                          title={`Check in ${r.fullName}?`}
                          message="Use this only if the participant is on site but can't show their QR code. The check-in is recorded as manual under your name."
                          confirmLabel="Check in"
                          triggerClass="btn-secondary btn-sm"
                        />
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState icon="users" title="No attendance yet">
          {roster.length ? "No participants match this filter." : "Once people register and check in, they'll appear here."}
        </EmptyState>
      )}
    </div>
  );
}

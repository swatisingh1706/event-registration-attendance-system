import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState, StatusBadge } from "@/components/ui/server";
import { requirePermission } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/datetime";
import { can } from "@/lib/permissions";

export const metadata: Metadata = { title: "Attendance" };

export default async function AttendanceIndex() {
  const user = await requirePermission("attendance.view", "/admin/attendance");
  const events = await prisma.event.findMany({
    where: { status: { not: "DRAFT" } },
    orderBy: { date: "desc" },
    include: { _count: { select: { registrations: { where: { status: "REGISTERED" } }, attendances: true } } },
  });
  return (
    <div>
      <h1 className="text-3xl font-semibold leading-tight">Attendance</h1>
      <p className="mb-8 text-muted">Choose an event to see who has checked in.</p>
      {events.length ? (
        <div className="table-wrap">
          <table className="w-full">
            <thead>
              <tr>
                <th className="th" scope="col">Event</th>
                <th className="th" scope="col">Date</th>
                <th className="th" scope="col">Registered</th>
                <th className="th" scope="col">Attended</th>
                <th className="th" scope="col">Rate</th>
                <th className="th" scope="col">Status</th>
                <th className="th" scope="col"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {events.map((e) => {
                const reg = e._count.registrations;
                return (
                  <tr key={e.id}>
                    <td className="td font-semibold">{e.title}</td>
                    <td className="td whitespace-nowrap">{formatDate(e.date, { short: true })}</td>
                    <td className="td tabular-nums">{reg}</td>
                    <td className="td tabular-nums">{e._count.attendances}</td>
                    <td className="td tabular-nums">{reg ? `${((e._count.attendances / reg) * 100).toFixed(1)}%` : "—"}</td>
                    <td className="td"><StatusBadge status={e.status} /></td>
                    <td className="td text-right whitespace-nowrap">
                      <Link href={`/admin/events/${e.id}/attendance`} className="btn-ghost btn-sm">Open</Link>
                      {can(user.role, "checkin") && <Link href={`/admin/scanner?event=${e.id}`} className="btn-ghost btn-sm">Scan</Link>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState icon="check" title="No attendance yet">Events will appear here once they are published.</EmptyState>
      )}
    </div>
  );
}

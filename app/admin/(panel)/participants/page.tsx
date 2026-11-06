import type { Metadata } from "next";
import Link from "next/link";
import { AttendanceStatus, Avatar, EmptyState } from "@/components/ui/server";
import { requirePermission } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { formatDate, formatInstantDateTime } from "@/lib/datetime";
import { can } from "@/lib/permissions";
import { listParticipants, type ParticipantFilters } from "@/lib/services/participants";

export const metadata: Metadata = { title: "Participants" };

type SP = { q?: string; event?: string; attendance?: string; sort?: string; dir?: string; page?: string };

export default async function ParticipantsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await requirePermission("participants.view", "/admin/participants");
  const sp = await searchParams;
  const filters: ParticipantFilters = {
    q: sp.q?.trim().slice(0, 80) || undefined,
    eventId: sp.event || undefined,
    attendance: sp.attendance === "present" || sp.attendance === "absent" ? sp.attendance : "all",
    sort: (["registered", "name", "event", "checkin"] as const).find((s) => s === sp.sort) ?? "registered",
    dir: sp.dir === "asc" ? "asc" : "desc",
    page: Number(sp.page) || 1,
  };
  const [{ rows, total, page, pages }, events] = await Promise.all([
    listParticipants(filters),
    prisma.event.findMany({ where: { status: { not: "DRAFT" } }, orderBy: { date: "desc" }, select: { id: true, title: true } }),
  ]);

  const qs = (over: Record<string, string | number | undefined>) => {
    const p = new URLSearchParams();
    const base = { q: filters.q, event: filters.eventId, attendance: filters.attendance === "all" ? undefined : filters.attendance, sort: filters.sort, dir: filters.dir, ...over };
    for (const [k, v] of Object.entries(base)) if (v !== undefined && v !== "") p.set(k, String(v));
    return p.toString();
  };
  const sortLink = (key: string, label: string) => {
    const active = filters.sort === key;
    const dir = active && filters.dir === "asc" ? "desc" : "asc";
    return (
      <Link href={`/admin/participants?${qs({ sort: key, dir, page: 1 })}`} className="-my-2.5 inline-flex min-h-10 items-center gap-1 hover:text-forest" aria-label={`Sort by ${label}`}>
        {label} {active && <span aria-hidden="true">{filters.dir === "asc" ? "↑" : "↓"}</span>}
      </Link>
    );
  };

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold leading-tight">Participants</h1>
          <p className="text-muted">{total.toLocaleString("en-IN")} {total === 1 ? "registration" : "registrations"}</p>
        </div>
        {can(user.role, "participants.export") && (
          <div className="flex gap-2">
            <a href={`/api/export/participants?${qs({ page: undefined })}&format=xlsx`} className="btn-primary">Export Excel</a>
            <a href={`/api/export/participants?${qs({ page: undefined })}`} className="btn-secondary">Export CSV</a>
          </div>
        )}
      </header>

      <form method="get" role="search" className="mb-5 grid gap-3 rounded-xl border border-line bg-white p-4 sm:grid-cols-2 lg:grid-cols-[2fr_2fr_1fr_auto]">
        <div>
          <label htmlFor="q" className="sr-only">Search participants</label>
          <input id="q" name="q" defaultValue={filters.q} placeholder="Search name, email, ID or organization" className="input" />
        </div>
        <div>
          <label htmlFor="event" className="sr-only">Event</label>
          <select id="event" name="event" defaultValue={filters.eventId ?? ""} className="input">
            <option value="">All events</option>
            {events.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="attendance" className="sr-only">Attendance</label>
          <select id="attendance" name="attendance" defaultValue={filters.attendance} className="input">
            <option value="all">Any attendance</option>
            <option value="present">Present</option>
            <option value="absent">Not checked in</option>
          </select>
        </div>
        <input type="hidden" name="sort" value={filters.sort} />
        <input type="hidden" name="dir" value={filters.dir} />
        <div className="flex gap-2">
          <button className="btn-primary flex-1">Filter</button>
          <Link href="/admin/participants" className="btn-ghost">Reset</Link>
        </div>
      </form>

      {rows.length ? (
        <>
          <div className="table-wrap">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="th" scope="col">{sortLink("name", "Participant")}</th>
                  <th className="th" scope="col">Email</th>
                  <th className="th" scope="col">{sortLink("event", "Event")}</th>
                  <th className="th" scope="col">{sortLink("registered", "Registered")}</th>
                  <th className="th" scope="col">Ticket</th>
                  <th className="th" scope="col">Attendance</th>
                  <th className="th" scope="col">{sortLink("checkin", "Check-in time")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="td"><div className="flex items-center gap-3"><Avatar name={r.fullName} /><div className="min-w-0"><p className="font-medium">{r.fullName}{r.isVolunteer && <span className="ml-2 rounded bg-mint px-1.5 py-0.5 text-[0.7rem] font-semibold text-forest-dark">Volunteer</span>}</p><p className="text-xs text-muted">{r.organization}</p></div></div></td>
                    <td className="td">{r.email}</td>
                    <td className="td">{r.event.title}<p className="text-xs text-muted">{formatDate(r.event.date, { short: true })}</p></td>
                    <td className="td whitespace-nowrap">{formatInstantDateTime(r.registeredAt)}</td>
                    <td className="td font-mono text-xs">{r.registrationNumber}</td>
                    <td className="td"><AttendanceStatus present={!!r.attendance} /></td>
                    <td className="td whitespace-nowrap">{r.attendance ? formatInstantDateTime(r.attendance.checkedInAt) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <nav aria-label="Pagination" className="mt-4 flex items-center justify-between text-sm">
            <span className="text-muted">Page {page} of {pages}</span>
            <div className="flex gap-2">
              {page > 1 ? <Link className="btn-secondary btn-sm" href={`/admin/participants?${qs({ page: page - 1 })}`}>Previous</Link> : <span className="btn-secondary btn-sm opacity-50" aria-disabled="true">Previous</span>}
              {page < pages ? <Link className="btn-secondary btn-sm" href={`/admin/participants?${qs({ page: page + 1 })}`}>Next</Link> : <span className="btn-secondary btn-sm opacity-50" aria-disabled="true">Next</span>}
            </div>
          </nav>
        </>
      ) : (
        <EmptyState icon="users" title="No participants found">Try changing your search or filters.</EmptyState>
      )}
    </div>
  );
}

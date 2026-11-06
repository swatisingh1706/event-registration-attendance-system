import Link from "next/link";
import { BarList, RegisteredVsAttended, TrendChart } from "@/components/dashboard/charts";
import { categoryRows } from "@/components/dashboard/rows";
import { Delta, Sparkline, StatTile } from "@/components/dashboard/stat-tile";
import { Icon } from "@/components/ui/icons";
import { StatusBadge } from "@/components/ui/server";
import { requirePermission } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { formatDate, formatTime, nowWall } from "@/lib/datetime";
import {
  getAttendanceByEvent,
  getAttendanceTrend,
  getCategoryDistribution,
  getDashboardStats,
  getPartnerParticipation,
  getRegistrationTrend,
} from "@/lib/services/stats";

const sum = (a: { count: number }[]) => a.reduce((s, d) => s + d.count, 0);

export default async function AdminDashboard() {
  const user = await requirePermission("dashboard.view", "/admin");
  const today = nowWall();
  today.setUTCHours(0, 0, 0, 0);
  const tomorrow = new Date(today.getTime() + 86400000);

  const [stats, trend, attTrend, byEvent, categories, partners, upcoming, happeningToday] = await Promise.all([
    getDashboardStats(),
    getRegistrationTrend(30),
    getAttendanceTrend(30),
    getAttendanceByEvent(8),
    getCategoryDistribution(),
    getPartnerParticipation(),
    prisma.event.findMany({
      where: { status: { in: ["REGISTRATION_OPEN", "FULL", "REGISTRATION_CLOSED", "PUBLISHED"] }, date: { gte: today } },
      orderBy: { date: "asc" },
      take: 5,
      include: { _count: { select: { registrations: { where: { status: "REGISTERED" } }, attendances: true } } },
    }),
    prisma.event.findMany({
      where: { status: { in: ["REGISTRATION_OPEN", "FULL", "REGISTRATION_CLOSED", "PUBLISHED"] }, date: { gte: today, lt: tomorrow } },
      include: { _count: { select: { registrations: { where: { status: "REGISTERED" } }, attendances: true } } },
    }),
  ]);

  const reg7 = sum(trend.slice(-7)), regPrev7 = sum(trend.slice(-14, -7));
  const att7 = sum(attTrend.slice(-7)), attPrev7 = sum(attTrend.slice(-14, -7));

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold leading-tight">Dashboard</h1>
          <p className="mt-1 text-muted">Welcome back, {user.name.split(" ")[0]}. Everything here is live from the database.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/scanner" className="btn-primary btn-sm"><Icon name="qr" className="size-4" /> Open scanner</Link>
          <Link href="/admin/events/new" className="btn-secondary btn-sm"><Icon name="plus" className="size-4" /> New event</Link>
        </div>
      </header>

      {happeningToday.map((e) => (
        <Link key={e.id} href={`/admin/events/${e.id}/attendance`} className="group flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-forest/25 bg-mint px-5 py-4 transition-colors hover:border-forest/50">
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-forest-dark">
            <span className="relative flex size-2.5"><span className="absolute inline-flex size-full animate-ping rounded-full bg-forest opacity-60" /><span className="relative inline-flex size-2.5 rounded-full bg-forest" /></span>
            Today
          </span>
          <span className="font-semibold">{e.title}</span>
          <span className="text-sm text-muted">{formatTime(e.startTime)} · {e.location}</span>
          <span className="ml-auto text-sm font-semibold tabular-nums">{e._count.attendances} of {e._count.registrations} checked in</span>
          <Icon name="arrow" className="size-4 text-forest transition-transform group-hover:translate-x-1" />
        </Link>
      ))}

      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line md:grid-cols-3 xl:grid-cols-6">
        <StatTile label="Total events" value={stats.totalEvents} />
        <StatTile label="Upcoming events" value={stats.upcomingEvents} />
        <StatTile label="Registrations" value={stats.totalRegistrations} trend={<Sparkline values={trend.slice(-12).map((d) => d.count)} label="Registrations per day, last 12 days" />}>
          <Delta now={reg7} before={regPrev7} period="7 days" />
        </StatTile>
        <StatTile label="Attendance" value={stats.totalAttendance} trend={<Sparkline values={attTrend.slice(-12).map((d) => d.count)} label="Check-ins per day, last 12 days" />}>
          <Delta now={att7} before={attPrev7} period="7 days" />
        </StatTile>
        <StatTile label="Attendance rate" value={`${Math.round(stats.attendanceRate)}%`} />
        <StatTile label="Active volunteers" value={stats.activeVolunteers} />
      </dl>

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-2">
        <section className="surface min-w-0 p-4 sm:p-6"><TrendChart data={trend} title="Registration trend" subtitle="Registrations per day, last 30 days" unit="Registrations" /></section>
        <section className="surface min-w-0 p-4 sm:p-6"><RegisteredVsAttended data={byEvent} title="Attendance by event" subtitle="Registered vs attended, most recent events" /></section>
        <section className="surface min-w-0 p-4 sm:p-6"><BarList rows={categoryRows(categories)} title="Event categories" subtitle="Published events by cause" unit="Events" /></section>
        <section className="surface min-w-0 p-4 sm:p-6"><BarList rows={partners.map((p) => ({ key: p.id, label: p.name, value: p.events }))} title="Partner participation" subtitle="Events each partner is involved in" unit="Events" /></section>
      </div>

      <section aria-labelledby="up">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="up" className="font-sans text-[0.9375rem] font-semibold">Coming up</h2>
          <Link href="/admin/events" className="link-arrow text-sm">All events <Icon name="arrow" className="size-4" /></Link>
        </div>
        <div className="table-wrap">
          <table className="w-full">
            <thead>
              <tr>
                <th className="th" scope="col">Event</th>
                <th className="th" scope="col">Date</th>
                <th className="th" scope="col">Registered</th>
                <th className="th" scope="col">Attended</th>
                <th className="th" scope="col">Status</th>
                <th className="th" scope="col"><span className="sr-only">Open</span></th>
              </tr>
            </thead>
            <tbody>
              {upcoming.map((e) => (
                <tr key={e.id}>
                  <td className="td font-medium">{e.title}</td>
                  <td className="td whitespace-nowrap">{formatDate(e.date, { short: true })}</td>
                  <td className="td tabular-nums">{e._count.registrations} / {e.capacity}</td>
                  <td className="td tabular-nums">{e._count.attendances}</td>
                  <td className="td"><StatusBadge status={e.status} /></td>
                  <td className="td text-right"><Link href={`/admin/events/${e.id}/attendance`} className="font-semibold text-forest hover:underline">Attendance</Link></td>
                </tr>
              ))}
              {!upcoming.length && (
                <tr><td colSpan={6} className="td py-8 text-center text-muted">No upcoming events. <Link className="font-semibold text-forest underline" href="/admin/events/new">Create one</Link>.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

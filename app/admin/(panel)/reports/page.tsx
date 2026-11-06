import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/ui/server";
import { requirePermission } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/datetime";
import { CATEGORY_LABEL } from "@/lib/event-state";
import { getSdgOptions } from "@/lib/services/public";
import { getReport, type ReportFilters } from "@/lib/services/reports";

export const metadata: Metadata = { title: "Reports" };

export default async function ReportsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requirePermission("reports.view", "/admin/reports");
  const sp = await searchParams;
  const filters: ReportFilters = { eventId: sp.event, category: sp.category, partnerId: sp.partner, sdg: sp.sdg, from: sp.from, to: sp.to };
  const [report, events, partners, sdgs] = await Promise.all([
    getReport(filters),
    prisma.event.findMany({ where: { status: { notIn: ["DRAFT", "CANCELLED"] } }, orderBy: { date: "desc" }, select: { id: true, title: true } }),
    prisma.partner.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    getSdgOptions(),
  ]);
  const { summary: s } = report;
  const exportQs = new URLSearchParams(Object.entries({ event: sp.event, category: sp.category, partner: sp.partner, sdg: sp.sdg, from: sp.from, to: sp.to }).filter((e): e is [string, string] => !!e[1])).toString();

  const tiles = [
    { l: "Events conducted", v: s.events },
    { l: "Registrations", v: s.registered },
    { l: "Attendance", v: s.attended },
    { l: "Attendance rate", v: `${s.rate.toFixed(1)}%` },
    { l: "Volunteers", v: s.volunteers },
    { l: "Volunteer hours", v: s.volunteerHours },
    { l: "Community hours", v: s.communityHours },
  ];

  return (
    <div className="space-y-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold leading-tight">Reports</h1>
          <p className="text-muted">Published events only. Drafts and cancelled events are excluded.</p>
        </div>
        <div className="flex gap-2">
          <a href={`/api/export/report?${exportQs ? `${exportQs}&` : ""}format=xlsx`} className="btn-primary">Export Excel</a>
          <a href={`/api/export/report${exportQs ? `?${exportQs}` : ""}`} className="btn-secondary">Export CSV</a>
        </div>
      </header>

      <form method="get" role="search" className="grid gap-3 rounded-xl border border-line bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
        <Select id="event" label="Event" value={sp.event} options={events.map((e) => [e.id, e.title])} all="All events" />
        <Select id="category" label="Category" value={sp.category} options={Object.entries(CATEGORY_LABEL)} all="All categories" />
        <Select id="partner" label="Partner" value={sp.partner} options={partners.map((p) => [p.id, p.name])} all="All partners" />
        <Select id="sdg" label="SDG" value={sp.sdg} options={sdgs.map((g) => [String(g.number), `SDG ${g.number} — ${g.title}`])} all="All SDGs" />
        <div>
          <label htmlFor="from" className="label">From</label>
          <input id="from" name="from" type="date" defaultValue={sp.from} className="input" />
        </div>
        <div>
          <label htmlFor="to" className="label">To</label>
          <input id="to" name="to" type="date" defaultValue={sp.to} className="input" />
        </div>
        <div className="flex items-end gap-2 sm:col-span-2">
          <button className="btn-primary">Apply filters</button>
          <Link href="/admin/reports" className="btn-ghost">Reset</Link>
        </div>
      </form>

      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-4 xl:grid-cols-7">
        {tiles.map((t) => (
          <div key={t.l} className="bg-white px-4 py-4">
            <dd className="font-display text-2xl font-semibold tabular-nums text-forest-dark">{typeof t.v === "number" ? t.v.toLocaleString("en-IN") : t.v}</dd>
            <dt className="mt-1 text-[0.7rem] font-semibold uppercase tracking-wider text-muted">{t.l}</dt>
          </div>
        ))}
      </dl>

      {report.rows.length ? (
        <>
          <section aria-labelledby="ev">
            <h2 id="ev" className="mb-3 font-semibold">Events</h2>
            <div className="table-wrap">
              <table className="w-full">
                <thead>
                  <tr>
                    {["Event", "Date", "Category", "Registered", "Attended", "Rate", "Hours"].map((h) => <th key={h} className="th" scope="col">{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {report.rows.map((r) => (
                    <tr key={r.id}>
                      <td className="td font-medium">{r.title}</td>
                      <td className="td whitespace-nowrap">{formatDate(r.date, { short: true })}</td>
                      <td className="td">{CATEGORY_LABEL[r.category]}</td>
                      <td className="td tabular-nums">{r.registered}</td>
                      <td className="td tabular-nums">{r.attended}</td>
                      <td className="td tabular-nums">{r.rate.toFixed(1)}%</td>
                      <td className="td tabular-nums">{r.hours.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <div className="grid grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-2">
            <section aria-labelledby="pp">
              <h2 id="pp" className="mb-3 font-semibold">Partner participation</h2>
              <div className="table-wrap">
                <table className="w-full">
                  <thead><tr>{["Partner", "Events", "Registered", "Attended"].map((h) => <th key={h} className="th" scope="col">{h}</th>)}</tr></thead>
                  <tbody>
                    {report.partners.map((p) => (
                      <tr key={p.id}><td className="td font-medium">{p.name}</td><td className="td tabular-nums">{p.events}</td><td className="td tabular-nums">{p.registered}</td><td className="td tabular-nums">{p.attended}</td></tr>
                    ))}
                    {!report.partners.length && <tr><td colSpan={4} className="td text-center text-muted">No partners on these events.</td></tr>}
                  </tbody>
                </table>
              </div>
            </section>
            <section aria-labelledby="sp">
              <h2 id="sp" className="mb-3 font-semibold">SDG participation</h2>
              <div className="table-wrap">
                <table className="w-full">
                  <thead><tr>{["Goal", "Events", "Registered", "Attended"].map((h) => <th key={h} className="th" scope="col">{h}</th>)}</tr></thead>
                  <tbody>
                    {report.sdgs.map((g) => (
                      <tr key={g.number} className={g.number === 17 ? "bg-mint/50" : ""}><td className="td font-medium">SDG {g.number} · {g.title}</td><td className="td tabular-nums">{g.events}</td><td className="td tabular-nums">{g.registered}</td><td className="td tabular-nums">{g.attended}</td></tr>
                    ))}
                    {!report.sdgs.length && <tr><td colSpan={4} className="td text-center text-muted">No SDGs mapped.</td></tr>}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </>
      ) : (
        <EmptyState icon="chart" title="No events match these filters">Try widening the date range or clearing a filter.</EmptyState>
      )}
    </div>
  );
}

function Select({ id, label, value, options, all }: { id: string; label: string; value?: string; options: (readonly [string, string])[] | [string, string][]; all: string }) {
  return (
    <div>
      <label htmlFor={id} className="label">{label}</label>
      <select id={id} name={id} defaultValue={value ?? ""} className="input">
        <option value="">{all}</option>
        {options.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
      </select>
    </div>
  );
}

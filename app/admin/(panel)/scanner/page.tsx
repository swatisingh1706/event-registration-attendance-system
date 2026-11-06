import type { Metadata } from "next";
import { Scanner } from "@/components/scanner/scanner";
import { requirePermission } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { formatDate, formatTime } from "@/lib/datetime";

export const metadata: Metadata = { title: "QR Scanner" };

export default async function ScannerPage({ searchParams }: { searchParams: Promise<{ event?: string }> }) {
  await requirePermission("checkin", "/admin/scanner");
  const { event } = await searchParams;
  const events = await prisma.event.findMany({
    where: { status: { in: ["PUBLISHED", "REGISTRATION_OPEN", "REGISTRATION_CLOSED", "FULL"] } },
    orderBy: { date: "asc" },
    select: { id: true, title: true, date: true, startTime: true },
  });
  const options = events.map((e) => ({ id: e.id, title: e.title, dateLabel: `${formatDate(e.date)} · ${formatTime(e.startTime)}` }));
  return (
    <div>
      <h1 className="text-3xl font-semibold leading-tight">QR Scanner</h1>
      <p className="mb-8 text-muted">Pick the event you&apos;re checking people into, then scan their tickets.</p>
      <Scanner events={options} initialEventId={options.some((o) => o.id === event) ? event : undefined} />
    </div>
  );
}

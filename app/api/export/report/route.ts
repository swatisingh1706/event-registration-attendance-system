import { NextResponse } from "next/server";
import { AuthError, authorize } from "@/lib/auth/session";
import { exportFormat, tabularResponse } from "@/lib/export";
import { formatDate } from "@/lib/datetime";
import { CATEGORY_LABEL } from "@/lib/event-state";
import { getReport } from "@/lib/services/reports";

export const dynamic = "force-dynamic";

/** Event report as CSV (default) or Excel (?format=xlsx), with the same filters as the Reports page. */
export async function GET(req: Request) {
  try {
    await authorize("reports.view");
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: "Not allowed" }, { status: e.kind === "UNAUTHENTICATED" ? 401 : 403 });
    throw e;
  }
  const sp = new URL(req.url).searchParams;
  const report = await getReport({
    eventId: sp.get("event") ?? undefined,
    category: sp.get("category") ?? undefined,
    partnerId: sp.get("partner") ?? undefined,
    sdg: sp.get("sdg") ?? undefined,
    from: sp.get("from") ?? undefined,
    to: sp.get("to") ?? undefined,
  });
  return tabularResponse(
    exportFormat(sp.get("format")),
    "report",
    "Event report",
    ["Event", "Date", "Category", "Status", "Registered", "Attended", "Attendance %", "Volunteers", "Community hours", "Volunteer hours", "Partners", "SDGs"],
    report.rows.map((r) => [
      r.title, formatDate(r.date), CATEGORY_LABEL[r.category], r.status, r.registered, r.attended, Number(r.rate.toFixed(1)), r.volunteers.size,
      Number(r.hours.toFixed(1)), Number(r.volunteerHours.toFixed(1)), r.partners.map((p) => p.name).join("; "), r.sdgs.map((s) => `SDG ${s.number}`).join("; "),
    ]),
  );
}

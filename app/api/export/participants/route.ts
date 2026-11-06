import { NextResponse } from "next/server";
import { AuthError, authorize } from "@/lib/auth/session";
import { exportFormat, tabularResponse } from "@/lib/export";
import { formatDate, formatInstantDateTime } from "@/lib/datetime";
import { exportParticipants, type ParticipantFilters } from "@/lib/services/participants";

export const dynamic = "force-dynamic";

/** Registered participants as CSV (default) or Excel (?format=xlsx). Honors the same filters as the admin table. */
export async function GET(req: Request) {
  try {
    await authorize("participants.export");
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: "Not allowed" }, { status: e.kind === "UNAUTHENTICATED" ? 401 : 403 });
    throw e;
  }
  const sp = new URL(req.url).searchParams;
  const filters: ParticipantFilters = {
    q: sp.get("q") ?? undefined,
    eventId: sp.get("event") ?? undefined,
    attendance: (sp.get("attendance") as ParticipantFilters["attendance"]) ?? "all",
    sort: (sp.get("sort") as ParticipantFilters["sort"]) ?? "registered",
    dir: sp.get("dir") === "asc" ? "asc" : "desc",
  };
  const rows = await exportParticipants(filters);
  return tabularResponse(
    exportFormat(sp.get("format")),
    "participants",
    "Registrations",
    ["Registration ID", "Name", "Email", "Phone", "Organization", "City", "Event", "Event date", "Volunteer interest", "Registered at", "Attendance", "Checked in at", "Checked in by", "Method"],
    rows.map((r) => [
      r.registrationNumber, r.fullName, r.email, r.phone, r.organization, r.city, r.event.title, formatDate(r.event.date),
      r.volunteerInterest, formatInstantDateTime(r.registeredAt), r.attendance ? "Present" : "Not checked in",
      r.attendance ? formatInstantDateTime(r.attendance.checkedInAt) : "", r.attendance?.checkedInBy?.name ?? "", r.attendance?.method ?? "",
    ]),
  );
}

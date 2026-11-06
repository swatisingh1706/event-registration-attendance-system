import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { AuthError, authorize } from "@/lib/auth/session";
import { rateLimit } from "@/lib/rate-limit";
import { checkInSchema } from "@/lib/validation";
import { performCheckIn } from "@/lib/services/checkin";
import { getEventAttendanceSummary } from "@/lib/services/stats";

export const dynamic = "force-dynamic";

/**
 * The scanner only ever sends { eventId, code, method }. Whether the participant is
 * "present" is decided here, against PostgreSQL — the client just renders the result.
 */
export async function POST(req: Request) {
  // Same-origin JSON only (defends against cross-site form posts riding the session cookie).
  const origin = req.headers.get("origin");
  if (origin && new URL(origin).host !== req.headers.get("host")) {
    return NextResponse.json({ status: "FORBIDDEN" }, { status: 403 });
  }
  if (!req.headers.get("content-type")?.includes("application/json")) {
    return NextResponse.json({ status: "INVALID_REQUEST" }, { status: 415 });
  }

  let user;
  try {
    user = await authorize("checkin");
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ status: e.kind }, { status: e.kind === "UNAUTHENTICATED" ? 401 : 403 });
    }
    throw e;
  }

  if (!(await rateLimit(`checkin:${user.id}`, 90, 60)).ok) {
    return NextResponse.json({ status: "RATE_LIMITED" }, { status: 429 });
  }

  const body = checkInSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ status: "INVALID" }, { status: 200 });

  try {
    const result = await performCheckIn({ actor: user, ...body.data });
    if (result.status === "SUCCESS") {
      revalidatePath("/admin", "layout");
      revalidatePath("/portal", "layout");
    }
    // Fresh counts straight from PostgreSQL so the scanner shows the true attendance after this scan.
    const counts = result.status === "SUCCESS" || result.status === "ALREADY_CHECKED_IN" ? await getEventAttendanceSummary(body.data.eventId) : undefined;
    return NextResponse.json({ ...result, counts }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("check-in failed", e);
    return NextResponse.json({ status: "ERROR" }, { status: 500 });
  }
}

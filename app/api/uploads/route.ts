import { NextResponse } from "next/server";
import { AuthError, authorizeUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { can } from "@/lib/permissions";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_BYTES = 3 * 1024 * 1024;

/** Identify the real file type from its first bytes — never trust the client-supplied name or MIME type. */
function sniff(b: Uint8Array): "image/jpeg" | "image/png" | "image/webp" | "image/gif" | null {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38) return "image/gif";
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return "image/webp";
  return null; // SVG and everything else is refused (SVG can carry scripts)
}

/** Staff upload images for events, partner logos and branding. Returns a stable URL to use in those fields. */
export async function POST(req: Request) {
  const origin = req.headers.get("origin");
  if (origin && new URL(origin).host !== req.headers.get("host")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let user;
  try {
    user = await authorizeUser();
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: "Please log in again." }, { status: 401 });
    throw e;
  }
  if (!(can(user.role, "events.manage") || can(user.role, "partners.manage") || can(user.role, "settings.manage"))) {
    return NextResponse.json({ error: "You don't have permission to upload images." }, { status: 403 });
  }
  if (!(await rateLimit(`upload:${user.id}`, 30, 600)).ok) return NextResponse.json({ error: "Too many uploads. Please wait a few minutes." }, { status: 429 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File) || file.size === 0) return NextResponse.json({ error: "Choose an image file." }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "That image is larger than 3 MB. Try a smaller one." }, { status: 413 });

  const bytes = new Uint8Array(await file.arrayBuffer());
  const mime = sniff(bytes);
  if (!mime) return NextResponse.json({ error: "Use a JPG, PNG, WebP or GIF image." }, { status: 415 });

  const row = await prisma.upload.create({ data: { mime, size: bytes.length, data: bytes, createdBy: user.id }, select: { id: true } });
  return NextResponse.json({ url: `/api/uploads/${row.id}` }, { status: 201 });
}

import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Public image delivery. Ids are unguessable and content never changes, so responses are cached for a year. */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[a-z0-9]{20,40}$/.test(id)) return new Response("Not found", { status: 404 });
  const row = await prisma.upload.findUnique({ where: { id }, select: { mime: true, data: true } });
  if (!row) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(row.data), {
    headers: {
      "Content-Type": row.mime,
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Disposition": "inline",
      "Content-Security-Policy": "default-src 'none'; img-src 'self'",
    },
  });
}

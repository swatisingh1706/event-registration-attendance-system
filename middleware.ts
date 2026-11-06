import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/auth/token";

/**
 * First line of defence only: unauthenticated visitors are bounced to /login (or /admin/login for the admin area) and
 * participants are kept out of /admin. Every page, action and route handler ALSO
 * re-checks the user's role from PostgreSQL — never rely on this alone.
 */
export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  if (pathname === "/admin/login") return NextResponse.next(); // the staff sign-in itself is public
  const claims = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);

  if (!claims) {
    const url = req.nextUrl.clone();
    url.pathname = pathname.startsWith("/admin") ? "/admin/login" : "/login";
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }
  if (pathname.startsWith("/admin") && claims.role === "PARTICIPANT") {
    const url = req.nextUrl.clone();
    url.pathname = "/portal";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/portal/:path*", "/admin/:path*"] };

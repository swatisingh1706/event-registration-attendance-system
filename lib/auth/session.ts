import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { can, isStaffRole, type Permission } from "@/lib/permissions";
import { SESSION_COOKIE, SESSION_MAX_AGE, signSession, verifySession } from "./token";

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  phone: string | null;
  organization: string | null;
  city: string | null;
  image: string | null;
  emailVerifiedAt: Date | null;
};

export async function startSession(userId: string, role: Role) {
  const token = await signSession(userId, role);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function endSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

/**
 * The signed cookie only proves *who* the user is. The role is always re-read
 * from PostgreSQL so a demoted or deleted user loses access immediately.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const claims = await verifySession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!claims) return null;
  const user = await prisma.user.findUnique({
    where: { id: claims.sub },
    select: { id: true, name: true, email: true, role: true, phone: true, organization: true, city: true, image: true, emailVerifiedAt: true, sessionsValidAfter: true },
  });
  if (!user) return null;
  // A password change/reset signs out every older session on every device.
  if (user.sessionsValidAfter && claims.iat * 1000 < user.sessionsValidAfter.getTime()) return null;
  const { sessionsValidAfter: _s, ...safe } = user;
  return safe;
});

export class AuthError extends Error {
  constructor(public kind: "UNAUTHENTICATED" | "FORBIDDEN") {
    super(kind);
  }
}

/** For server actions / route handlers: throws instead of redirecting. */
export async function authorize(permission: Permission): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new AuthError("UNAUTHENTICATED");
  if (!can(user.role, permission)) throw new AuthError("FORBIDDEN");
  return user;
}

export async function authorizeUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new AuthError("UNAUTHENTICATED");
  return user;
}

/** For pages/layouts: redirects to login (or the participant portal). */
export async function requireUser(next?: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(next ? `/login?next=${encodeURIComponent(next)}` : "/login");
  return user;
}

export async function requirePermission(permission: Permission, next?: string): Promise<CurrentUser> {
  const user = await requireStaff(next);
  if (!can(user.role, permission)) redirect(homeFor(user.role));
  return user;
}

/** Admin-area guard: signed-out visitors go to the staff sign-in, participants back to their portal. */
export async function requireStaff(next?: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(next ? `/admin/login?next=${encodeURIComponent(next)}` : "/admin/login");
  if (!isStaffRole(user.role)) redirect("/portal");
  return user;
}

/** Where a freshly signed-in user should land. */
export function homeFor(role: Role) {
  if (!isStaffRole(role)) return "/portal";
  return can(role, "dashboard.view") ? "/admin" : "/admin/scanner";
}

/** Only allow same-site relative redirects. */
export function safeNext(next: string | null | undefined): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return null;
  return next;
}

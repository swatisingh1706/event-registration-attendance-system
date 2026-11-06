import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/forms";
import { Logo } from "@/components/site/brand";
import { getCurrentUser, homeFor, safeNext } from "@/lib/auth/session";
import { isStaffRole } from "@/lib/permissions";
import { getSettings } from "@/lib/services/settings";

export const metadata: Metadata = { title: "Staff sign-in", robots: { index: false } };

/** Separate entrance for NGO admins and check-in staff. Participants sign in at /login. */
export default async function StaffLoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const sp = await searchParams;
  const next = safeNext(sp.next)?.startsWith("/admin") ? safeNext(sp.next)! : undefined;
  const [user, settings] = await Promise.all([getCurrentUser(), getSettings()]);
  if (user && isStaffRole(user.role)) redirect(next ?? homeFor(user.role));

  return (
    <main id="main" className="grid min-h-dvh place-items-center bg-forest-dark px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Logo settings={settings} href="/" light />
        </div>
        <div className="rounded-2xl bg-white p-6 shadow-xl sm:p-8">
          <p className="eyebrow">Staff area</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">Staff sign-in</h1>
          <p className="mb-6 mt-1 text-sm text-muted">For NGO admins and check-in staff. Participants sign in from the main site.</p>
          {user && !isStaffRole(user.role) && (
            <p role="status" className="mb-5 rounded-lg bg-amber-soft px-4 py-3 text-sm text-amber">
              You&apos;re signed in as a participant ({user.email}). Signing in here with a staff account will replace that session.
            </p>
          )}
          <LoginForm next={next} audience="staff" />
        </div>
        <p className="mt-6 text-center text-sm text-white/70">
          <Link href="/login" className="font-semibold text-white underline-offset-4 hover:underline">Participant login</Link>
          {" · "}
          <Link href="/" className="hover:underline">Back to site</Link>
        </p>
      </div>
    </main>
  );
}

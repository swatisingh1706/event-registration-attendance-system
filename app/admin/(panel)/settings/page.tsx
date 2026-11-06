import type { Metadata } from "next";
import Link from "next/link";
import { SettingsForm } from "@/components/admin/settings-form";
import { requirePermission } from "@/lib/auth/session";
import { mailEnabled } from "@/lib/mail";
import { can } from "@/lib/permissions";
import { getSettings } from "@/lib/services/settings";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await requirePermission("settings.manage", "/admin/settings");
  const s = await getSettings();
  const v = Object.fromEntries(Object.entries(s).map(([k, val]) => [k, typeof val === "string" ? val : typeof val === "number" ? String(val) : ""]));
  return (
    <div className="max-w-3xl">
      <h1 className="text-3xl font-semibold leading-tight">Settings</h1>
      <p className="mb-8 text-muted">Branding and contact details. Changes apply across the whole site immediately.</p>
      {can(user.role, "users.manage") && (
        <p className="mb-8 rounded-lg bg-mint px-4 py-3 text-sm">
          Need to change who has admin or check-in access? <Link href="/admin/settings/team" className="font-semibold text-forest underline">Manage team roles</Link>.
        </p>
      )}
      <div className={`mb-8 rounded-lg border px-4 py-3 text-sm ${mailEnabled() ? "border-forest/25 bg-mint" : "border-amber/30 bg-amber-soft"}`}>
        {mailEnabled() ? (
          <><strong>Email is on.</strong> Sign-ups confirm their address, and password-reset and registration emails are sent.</>
        ) : (
          <><strong>Email is not set up.</strong> Password-reset and registration emails are not sent, and sign-ups are not asked to confirm their address. Add <code>RESEND_API_KEY</code> and <code>MAIL_FROM</code> in your hosting settings to turn it on. Until then, super admins can issue temporary passwords under Team roles.</>
        )}
      </div>
      <SettingsForm v={v} />
    </div>
  );
}

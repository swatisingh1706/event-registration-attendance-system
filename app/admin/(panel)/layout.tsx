import type { Metadata } from "next";
import { AdminNav, type NavItem } from "@/components/admin/sidebar";
import { Logo } from "@/components/site/brand";
import { logoutAction } from "@/app/actions/auth";
import { requireStaff } from "@/lib/auth/session";
import { can, ROLE_LABEL, type Permission } from "@/lib/permissions";
import { getSettings } from "@/lib/services/settings";

export const metadata: Metadata = { title: { default: "Admin", template: "%s · Admin" }, robots: { index: false } };

const NAV: (NavItem & { needs: Permission })[] = [
  { group: "Overview", href: "/admin", label: "Dashboard", icon: "grid", needs: "dashboard.view" },
  { group: "On the day", href: "/admin/scanner", label: "QR Scanner", icon: "qr", needs: "checkin" },
  { group: "On the day", href: "/admin/attendance", label: "Attendance", icon: "check", needs: "attendance.view" },
  { group: "Manage", href: "/admin/events", label: "Events", icon: "calendar", needs: "events.manage" },
  { group: "Manage", href: "/admin/participants", label: "Participants", icon: "users", needs: "participants.view" },
  { group: "Manage", href: "/admin/partners", label: "Partners", icon: "handshake", needs: "partners.manage" },
  { group: "Insights", href: "/admin/reports", label: "Reports", icon: "chart", needs: "reports.view" },
];

/** Authoritative gate for everything under /admin: the role is re-read from PostgreSQL. */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const [user, settings] = await Promise.all([requireStaff("/admin"), getSettings()]);
  const items = NAV.filter((n) => can(user.role, n.needs)).map(({ needs: _n, ...rest }) => rest);
  const secondary: NavItem[] = can(user.role, "settings.manage") ? [{ group: "Admin", href: "/admin/settings", label: "Settings", icon: "settings" }] : [];

  return (
    <div className="min-h-dvh bg-white lg:flex">
      <AdminNav
        items={items}
        secondary={secondary}
        brand={<Logo settings={settings} href="/admin" light />}
        user={{ name: user.name, role: ROLE_LABEL[user.role] }}
        logout={
          <form action={logoutAction}>
            <button className="rounded-md px-2.5 py-1.5 text-sm font-medium text-white/60 transition-colors hover:bg-white/10 hover:text-white">Log out</button>
          </form>
        }
      />
      <main id="main" className="min-w-0 flex-1 px-4 py-7 sm:px-9 sm:py-9">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}

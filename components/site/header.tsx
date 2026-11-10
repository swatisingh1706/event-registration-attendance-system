import Link from "next/link";
import { getCurrentUser, homeFor } from "@/lib/auth/session";
import { getSettings } from "@/lib/services/settings";
import { logoutAction } from "@/app/actions/auth";
import { isStaffRole } from "@/lib/permissions";
import { Icon } from "@/components/ui/icons";
import { Logo } from "./brand";
import { NavLinks } from "./nav-links";

export async function SiteHeader() {
  const [settings, user] = await Promise.all([getSettings(), getCurrentUser()]);
  const staff = isStaffRole(user?.role);
  return (
    <header className="sticky top-0 z-30 border-b border-line/80 bg-ivory/85 backdrop-blur-md supports-[backdrop-filter]:bg-ivory/75">
      <div className="mx-auto flex h-[4.25rem] max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Logo settings={settings} />
        <NavLinks />
        <div className="flex items-center gap-2">
          {user ? (
            <details className="group relative">
              <summary className="flex cursor-pointer list-none items-center gap-2 rounded-full border border-line-strong bg-white py-1 pl-1 pr-3 transition-colors hover:border-forest/50 [&::-webkit-details-marker]:hidden">
                <span aria-hidden="true" className="grid size-8 place-items-center rounded-full bg-forest text-sm font-bold text-white">{user.name[0]?.toUpperCase()}</span>
                <span className="text-sm font-semibold max-sm:sr-only">{user.name.split(" ")[0]}<span className="sr-only"> — account menu</span></span>
                <Icon name="chevron" className="size-4 text-muted transition-transform group-open:rotate-180" />
              </summary>
              <div className="absolute right-0 mt-2 w-56 origin-top-right animate-fade rounded-xl border border-line bg-white p-1.5 shadow-[0_18px_40px_-16px_rgb(29_42_35/0.35)]">
                <p className="truncate px-3 pb-2 pt-1.5 text-xs text-muted">{user.email}</p>
                <MenuLink href="/portal" icon="home">My Portal</MenuLink>
                <MenuLink href="/portal/tickets" icon="ticket">My Tickets</MenuLink>
                <MenuLink href="/portal/profile" icon="user">Profile</MenuLink>
                {staff && <MenuLink href={homeFor(user.role)} icon="grid">Admin area</MenuLink>}
                <form action={logoutAction} className="mt-1 border-t border-line pt-1">
                  <button className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-charcoal/80 hover:bg-paper">
                    <Icon name="logout" className="size-4" /> Log out
                  </button>
                </form>
              </div>
            </details>
          ) : (
            <>
              <Link href="/login" className="btn-ghost btn-sm">
                Log in
              </Link>
              <Link href="/register" className="btn-primary btn-sm hidden min-[400px]:inline-flex">
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function MenuLink({ href, icon, children }: { href: string; icon: "home" | "ticket" | "user" | "grid"; children: React.ReactNode }) {
  return (
    <Link href={href} className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-charcoal/80 hover:bg-paper hover:text-charcoal">
      <Icon name={icon} className="size-4" /> {children}
    </Link>
  );
}

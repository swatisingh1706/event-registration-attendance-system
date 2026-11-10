"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/ui/icons";

const ITEMS: { href: string; label: string; icon: IconName; match: (p: string) => boolean }[] = [
  { href: "/", label: "Home", icon: "home", match: (p) => p === "/" },
  { href: "/events", label: "Events", icon: "calendar", match: (p) => p.startsWith("/events") },
  { href: "/portal/tickets", label: "Tickets", icon: "ticket", match: (p) => p.startsWith("/portal/tickets") || p.startsWith("/portal/registered") },
  { href: "/portal/profile", label: "Profile", icon: "user", match: (p) => p.startsWith("/portal/profile") || p === "/login" || p === "/register" },
];

/** Bottom navigation for phones (participant side). */
export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Primary" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/92 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden">
      <ul className="mx-auto grid max-w-md grid-cols-4">
        {ITEMS.map((item) => {
          const active = item.match(pathname);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`relative flex min-h-[3.6rem] flex-col items-center justify-center gap-1 text-[0.7rem] font-semibold transition-colors ${active ? "text-forest" : "text-muted"}`}
              >
                <span aria-hidden="true" className={`absolute inset-x-6 top-0 h-0.5 rounded-b-full bg-forest transition-opacity ${active ? "opacity-100" : "opacity-0"}`} />
                <Icon name={item.icon} className="size-[1.35rem]" strokeWidth={active ? 2.1 : 1.7} />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

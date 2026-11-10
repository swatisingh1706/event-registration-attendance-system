"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/portal", label: "Overview", exact: true },
  { href: "/portal/tickets", label: "My Tickets" },
  { href: "/portal/profile", label: "Profile" },
];

export function PortalTabs() {
  const pathname = usePathname();
  return (
    <nav aria-label="Portal" className="mb-10 hidden gap-6 border-b border-line md:flex">
      {TABS.map((t) => {
        const active = t.exact ? pathname === t.href : pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={`relative -mb-px py-3 text-[0.9375rem] font-semibold transition-colors ${active ? "text-forest" : "text-muted hover:text-charcoal"}`}
          >
            {t.label}
            <span aria-hidden="true" className={`absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-forest transition-transform duration-300 ${active ? "scale-x-100" : "scale-x-0"}`} />
          </Link>
        );
      })}
    </nav>
  );
}

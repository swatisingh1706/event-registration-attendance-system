"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/events", label: "Events" },
  { href: "/volunteer", label: "Volunteer" },
  { href: "/partners", label: "Partners" },
  { href: "/about", label: "About" },
  { href: "/portal", label: "My Portal" },
];

export function NavLinks() {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
      {LINKS.map((l) => {
        const active = pathname === l.href || pathname.startsWith(l.href + "/");
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={`group relative rounded-md px-3 py-2 text-[0.9375rem] font-medium transition-colors ${active ? "text-forest" : "text-charcoal/80 hover:text-charcoal"}`}
          >
            {l.label}
            <span
              aria-hidden="true"
              className={`absolute inset-x-3 -bottom-px h-0.5 origin-left rounded-full bg-forest transition-transform duration-300 ${active ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"}`}
            />
          </Link>
        );
      })}
    </nav>
  );
}

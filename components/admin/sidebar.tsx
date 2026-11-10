"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Icon, type IconName } from "@/components/ui/icons";

export type NavItem = { href: string; label: string; icon: IconName; group?: string };

export function AdminNav({
  items,
  secondary,
  brand,
  user,
  logout,
}: {
  items: NavItem[];
  secondary: NavItem[];
  brand: React.ReactNode;
  user: { name: string; role: string };
  logout: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isActive = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));

  // Preserve order while grouping under small section labels.
  const all = [...items, ...secondary];
  const groups = all.reduce<{ name: string; links: NavItem[] }[]>((acc, i) => {
    const name = i.group ?? "";
    const g = acc.find((x) => x.name === name);
    if (g) g.links.push(i);
    else acc.push({ name, links: [i] });
    return acc;
  }, []);

  return (
    <>
      {/* mobile top bar */}
      <div className="sticky top-0 z-40 flex h-14 items-center justify-between bg-forest-deep px-4 text-white lg:hidden">
        <div>{brand}</div>
        <button
          type="button"
          aria-expanded={open}
          aria-controls="admin-menu"
          onClick={() => setOpen((o) => !o)}
          className="grid size-11 place-items-center rounded-lg hover:bg-white/10"
          aria-label={open ? "Close menu" : "Open menu"}
        >
          <Icon name={open ? "x" : "menu"} />
        </button>
      </div>

      <aside
        id="admin-menu"
        className={`${open ? "flex" : "hidden"} fixed inset-x-0 bottom-0 top-14 z-30 flex-col overflow-y-auto bg-forest-deep px-3 py-5 lg:sticky lg:top-0 lg:flex lg:h-dvh lg:w-64 lg:shrink-0 lg:inset-auto`}
      >
        <div className="mb-7 hidden px-3 lg:block">{brand}</div>
        <nav aria-label="Admin" className="flex-1 space-y-6">
          {groups.map((g) => (
            <div key={g.name}>
              {g.name && <p className="mb-1.5 px-3 text-[0.7rem] font-semibold uppercase tracking-wider text-white/65">{g.name}</p>}
              <ul className="space-y-0.5">
                {g.links.map((i) => {
                  const active = isActive(i.href);
                  return (
                    <li key={i.href}>
                      <Link
                        href={i.href}
                        onClick={() => setOpen(false)}
                        aria-current={active ? "page" : undefined}
                        className={`group relative flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors ${
                          active ? "bg-white/12 text-white" : "text-white/65 hover:bg-white/[0.07] hover:text-white"
                        }`}
                      >
                        <span aria-hidden="true" className={`absolute -left-3 top-2 h-6 w-1 rounded-r-full bg-sage transition-opacity ${active ? "opacity-100" : "opacity-0"}`} />
                        <Icon name={i.icon} className={`size-[1.15rem] ${active ? "text-white" : "text-white/55 group-hover:text-white/85"}`} />
                        {i.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
        <div className="mt-6 border-t border-white/10 px-1 pt-4 text-white">
          <div className="flex items-center gap-3 px-2">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-white/15 text-sm font-semibold">{user.name[0]?.toUpperCase()}</span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold leading-tight">{user.name}</p>
              <p className="text-xs text-white/50">{user.role}</p>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1">
            <Link href="/" className="rounded-md px-2.5 py-1.5 text-sm font-medium text-white/60 transition-colors hover:bg-white/10 hover:text-white">
              View site
            </Link>
            {logout}
          </div>
        </div>
      </aside>
    </>
  );
}

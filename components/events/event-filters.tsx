"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Icon } from "@/components/ui/icons";

type Props = {
  categories: { value: string; label: string }[];
  sdgs: { value: string; label: string }[];
};

/** Filters that apply as you go: typing searches after a short pause, chips and toggles apply immediately. */
export function EventFilters({ categories, sdgs }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();
  const [q, setQ] = useState(params.get("q") ?? "");
  const first = useRef(true);

  const category = params.get("category") ?? "";
  const sdg = params.get("sdg") ?? "";
  const when = params.get("when") === "past" || params.get("when") === "all" ? params.get("when")! : "upcoming";

  function push(patch: Record<string, string | null>) {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    const qs = next.toString();
    start(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  }

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const t = setTimeout(() => push({ q: q.trim() || null }), 320);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const filtered = !!(q || category || sdg || when !== "upcoming");
  const chip = (active: boolean) =>
    `rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${active ? "border-forest bg-forest text-white" : "border-line-strong bg-white text-charcoal/80 hover:border-forest/50 hover:text-forest"}`;

  return (
    <div role="search" aria-label="Filter events" className="relative">
      <div className={`absolute -top-3 left-0 h-0.5 w-full overflow-hidden rounded-full transition-opacity ${pending ? "opacity-100" : "opacity-0"}`} aria-hidden="true">
        <div className="h-full w-1/3 animate-[slide_1s_ease-in-out_infinite] rounded-full bg-forest" />
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <label htmlFor="q" className="sr-only">Search events</label>
          <Icon name="search" className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-muted" />
          <input
            id="q"
            name="q"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by event, place or keyword"
            className="input h-12 pl-11 pr-10"
            autoComplete="off"
          />
          {q && (
            <button type="button" onClick={() => setQ("")} className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-md text-muted hover:bg-paper hover:text-charcoal" aria-label="Clear search">
              <Icon name="x" className="size-4" />
            </button>
          )}
        </div>

        <div className="inline-flex shrink-0 rounded-[10px] border border-line-strong bg-white p-1" role="group" aria-label="Date range">
          {[
            ["upcoming", "Upcoming"],
            ["past", "Past"],
            ["all", "All"],
          ].map(([v, l]) => (
            <button
              key={v}
              type="button"
              aria-pressed={when === v}
              onClick={() => push({ when: v === "upcoming" ? null : v })}
              className={`rounded-md px-3.5 py-1.5 text-sm font-semibold transition-colors ${when === v ? "bg-forest text-white" : "text-charcoal/70 hover:text-forest"}`}
            >
              {l}
            </button>
          ))}
        </div>

        <div>
          <label htmlFor="sdg" className="sr-only">Sustainable Development Goal</label>
          <select id="sdg" value={sdg} onChange={(e) => push({ sdg: e.target.value || null })} className="input h-12 md:w-56">
            <option value="">All SDGs</option>
            {sdgs.map((g) => (
              <option key={g.value} value={g.value}>{g.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label="Category">
        <button type="button" aria-pressed={!category} onClick={() => push({ category: null })} className={chip(!category)}>All causes</button>
        {categories.map((c) => (
          <button key={c.value} type="button" aria-pressed={category === c.value} onClick={() => push({ category: category === c.value ? null : c.value })} className={`${chip(category === c.value)} shrink-0`}>
            {c.label}
          </button>
        ))}
        {filtered && (
          <button type="button" onClick={() => { setQ(""); start(() => router.replace(pathname, { scroll: false })); }} className="shrink-0 px-2 py-1.5 text-sm font-semibold text-clay hover:underline">
            Clear all
          </button>
        )}
      </div>
    </div>
  );
}

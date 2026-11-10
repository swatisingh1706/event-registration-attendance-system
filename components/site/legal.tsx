import type { OrgSettings } from "@prisma/client";

export const LEGAL_UPDATED = "26 October 2026";

export function LegalPage({ title, intro, children }: { title: string; intro: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 md:py-20">
      <h1 className="text-4xl font-semibold leading-[1.05] sm:text-5xl">{title}</h1>
      <p className="mt-3 text-sm text-muted">Last updated {LEGAL_UPDATED}</p>
      <p className="mt-6 text-lg leading-relaxed text-charcoal/85">{intro}</p>
      <div className="mt-10 space-y-9 [&_h2]:text-2xl [&_h2]:font-semibold [&_li]:mt-1.5 [&_p]:mt-3 [&_p]:leading-[1.75] [&_p]:text-charcoal/85 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:leading-[1.7] [&_ul]:text-charcoal/85">
        {children}
      </div>
    </div>
  );
}

export function contactLine(s: Pick<OrgSettings, "contactEmail" | "contactPhone" | "address" | "name">) {
  const parts = [s.contactEmail, s.contactPhone, s.address].filter(Boolean);
  return parts.length ? parts.join(" · ") : `the ${s.name} team`;
}

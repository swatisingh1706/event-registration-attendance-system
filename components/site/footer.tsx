import Link from "next/link";
import { getSettings } from "@/lib/services/settings";
import { Logo } from "./brand";

export async function SiteFooter() {
  const s = await getSettings();
  const socials = [
    { label: "Instagram", href: s.instagramUrl },
    { label: "LinkedIn", href: s.linkedinUrl },
    { label: "Facebook", href: s.facebookUrl },
    { label: "X / Twitter", href: s.twitterUrl },
  ].filter((x) => x.href);
  const link = "-my-0.5 py-2 text-white/65 transition-colors hover:text-white md:py-1";
  return (
    <footer className="mt-28 bg-forest-deep text-white/70">
      <div className="mx-auto max-w-6xl px-4 pb-8 pt-16 sm:px-6">
        <div className="grid gap-12 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div>
            <Logo settings={s} light />
            <p className="mt-5 max-w-xs font-display text-2xl leading-snug text-white">{s.tagline}</p>
          </div>
          <nav aria-label="Explore" className="space-y-2.5 text-[0.9375rem]">
            <p className="mb-3 text-sm font-semibold text-white">Explore</p>
            <Link className={`block ${link}`} href="/events">Events</Link>
            <Link className={`block ${link}`} href="/volunteer">Become a volunteer</Link>
            <Link className={`block ${link}`} href="/partners">Partners</Link>
            <Link className={`block ${link}`} href="/about">About us</Link>
          </nav>
          <div className="space-y-2.5 text-[0.9375rem]">
            <p className="mb-3 text-sm font-semibold text-white">Contact</p>
            {s.contactEmail && <a className={`block ${link}`} href={`mailto:${s.contactEmail}`}>{s.contactEmail}</a>}
            {s.contactPhone && <p>{s.contactPhone}</p>}
            {s.address && <p className="max-w-[16rem] text-white/70">{s.address}</p>}
          </div>
          <div className="space-y-2.5 text-[0.9375rem]">
            <p className="mb-3 text-sm font-semibold text-white">Follow</p>
            {socials.map((x) => (
              <a key={x.label} href={x.href!} rel="noopener noreferrer" target="_blank" className={`block ${link}`}>{x.label}</a>
            ))}
            {s.website && <a className={`block ${link}`} href={s.website} rel="noopener noreferrer" target="_blank">{s.website.replace(/^https?:\/\//, "")}</a>}
          </div>
        </div>
        <div className="mt-14 flex flex-col gap-3 border-t border-white/10 pt-6 text-sm text-white/70 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} {s.name}. Supporting SDG 17 — Partnerships for the Goals.</p>
          <span className="flex flex-wrap items-center gap-x-5">
            <Link href="/privacy" className="-my-2 inline-block py-2.5 hover:text-white">Privacy</Link>
            <Link href="/terms" className="-my-2 inline-block py-2.5 hover:text-white">Terms</Link>
            <Link href="/admin/login" className="-my-2 inline-block py-2.5 hover:text-white">Staff sign-in</Link>
          </span>
        </div>
      </div>
    </footer>
  );
}

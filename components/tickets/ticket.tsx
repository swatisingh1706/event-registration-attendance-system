import { CoverImage } from "@/components/ui/client";
import { formatDate, formatInstantTime, formatTime } from "@/lib/datetime";
import { Icon } from "@/components/ui/icons";

export type TicketData = {
  orgName: string;
  eventTitle: string;
  participant: string;
  date: Date;
  startTime: string;
  location: string;
  registrationNumber: string;
  qr: string;
  state: "REGISTERED" | "CHECKED_IN" | "CANCELLED" | "EVENT_CANCELLED";
  checkedInAt?: Date | null;
  cover?: string | null;
};

/** The mobile-first digital ticket. Only the QR token is encoded — never personal data. */
export function Ticket({ t }: { t: TicketData }) {
  const dead = t.state === "CANCELLED" || t.state === "EVENT_CANCELLED";
  return (
    <section aria-label={`Ticket for ${t.eventTitle}`} className="overflow-hidden rounded-3xl border border-line bg-white shadow-[0_24px_50px_-28px_rgb(29_42_35/0.55)]">
      <div className="relative isolate overflow-hidden px-6 pb-8 pt-7 text-center text-white">
        <CoverImage src={t.cover} alt="" seed={t.eventTitle} eager className="absolute inset-0 -z-10 size-full" />
        <div className="absolute inset-0 -z-10 bg-forest-deep/80" aria-hidden="true" />
        <p className="text-xs font-semibold tracking-[0.18em] text-white/75 uppercase">{t.orgName}</p>
        <h1 className="mt-3 text-[1.65rem] font-semibold uppercase leading-[1.1] tracking-tight text-white">{t.eventTitle}</h1>
      </div>

      <div className="relative" aria-hidden="true">
        {/* perforation: notches cut into the card edge */}
        <span className="absolute -left-3.5 -top-3.5 size-7 rounded-full bg-mint ring-1 ring-line" />
        <span className="absolute -right-3.5 -top-3.5 size-7 rounded-full bg-mint ring-1 ring-line" />
        <div className="mx-5 border-t-2 border-dashed border-line-strong" />
      </div>

      <div className="px-6 pb-8 pt-6 text-center">
        <p className="font-display text-2xl font-semibold uppercase tracking-tight">{t.participant}</p>
        <p className="mt-2 font-semibold">
          {formatDate(t.date)} · {formatTime(t.startTime)}
        </p>
        <p className="mt-0.5 text-muted">{t.location}</p>

        <div className={`mx-auto mt-6 w-full max-w-[19rem] rounded-2xl border border-line bg-white p-3 ${dead ? "opacity-30" : ""}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={t.qr} alt={`QR code for registration ${t.registrationNumber}. Show this to check-in staff.`} className="aspect-square w-full" />
        </div>

        <p className="mt-5 text-xs font-semibold tracking-widest text-muted uppercase">Registration ID</p>
        <p className="font-mono text-xl font-semibold tracking-wider">{t.registrationNumber}</p>

        <p
          className={`mx-auto mt-5 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold tracking-widest uppercase ${
            t.state === "REGISTERED" ? "bg-mint text-forest-dark" : t.state === "CHECKED_IN" ? "bg-forest text-white" : "bg-danger-soft text-danger"
          }`}
        >
          <Icon name={dead ? "x" : "check"} className="size-4" strokeWidth={2.4} />
          {t.state === "REGISTERED" && "Registered"}
          {t.state === "CHECKED_IN" && `Checked in${t.checkedInAt ? ` · ${formatInstantTime(t.checkedInAt)}` : ""}`}
          {t.state === "CANCELLED" && "Cancelled"}
          {t.state === "EVENT_CANCELLED" && "Event cancelled"}
        </p>
      </div>
    </section>
  );
}

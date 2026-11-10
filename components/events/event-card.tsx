import Link from "next/link";
import { CoverImage } from "@/components/ui/client";
import { Icon } from "@/components/ui/icons";
import { StateBadge } from "@/components/ui/server";
import { formatDate, formatTime } from "@/lib/datetime";
import { CATEGORY_LABEL } from "@/lib/event-state";
import type { EventView } from "@/lib/services/events";

function dateParts(date: Date) {
  return {
    month: new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", month: "short" }).format(date),
    day: new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", day: "numeric" }).format(date),
  };
}

export function DateChip({ date, className = "" }: { date: Date; className?: string }) {
  const { month, day } = dateParts(date);
  return (
    <span className={`flex min-w-[3.1rem] flex-col items-center rounded-lg bg-white px-2 py-1.5 leading-none shadow-[0_2px_10px_rgb(0_0_0/0.12)] ${className}`}>
      <span className="text-[0.65rem] font-bold uppercase tracking-wider text-clay">{month}</span>
      <span className="mt-0.5 font-display text-xl font-semibold text-charcoal">{day}</span>
    </span>
  );
}

/** Seats meter: a thin bar and a plain sentence. Turns clay-coloured when the last few seats are going. */
export function SeatMeter({ event, className = "" }: { event: EventView; className?: string }) {
  const pct = Math.min(100, Math.round((event.registered / event.capacity) * 100));
  const low = event.remaining > 0 && event.remaining <= Math.max(5, Math.round(event.capacity * 0.1));
  return (
    <div className={className}>
      <div className="h-1 overflow-hidden rounded-full bg-line" role="presentation">
        <div className={`h-full rounded-full transition-[width] duration-700 ${low || event.remaining === 0 ? "bg-clay" : "bg-forest"}`} style={{ width: `${pct}%` }} />
      </div>
      <p className={`mt-1.5 text-[0.8125rem] ${low || event.remaining === 0 ? "font-semibold text-clay" : "text-muted"}`}>
        {event.remaining === 0 ? "No seats left" : low ? `Only ${event.remaining} seats left` : `${event.remaining} of ${event.capacity} seats left`}
      </p>
    </div>
  );
}

export function EventCard({ event, priority = false, headingLevel = 3 }: { event: EventView; priority?: boolean; headingLevel?: 2 | 3 }) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  const showSeats = event.state === "OPEN" || event.state === "FULL";
  return (
    <article className="group">
      <Link href={`/events/${event.slug}`} className="relative block aspect-[4/3] overflow-hidden rounded-2xl bg-paper" aria-hidden="true" tabIndex={-1}>
        <CoverImage src={event.coverImage} alt="" seed={event.title} eager={priority} className="size-full transition-transform duration-700 ease-out group-hover:scale-[1.04]" />
        <span className="absolute left-3 top-3">
          <DateChip date={event.date} />
        </span>
        <span className="absolute bottom-3 left-3 rounded-md bg-white/95 px-2 py-1 shadow-sm">
          <StateBadge state={event.state} />
        </span>
      </Link>
      <div className="pt-4">
        <p className="flex items-center gap-2 text-[0.8125rem] text-muted">
          <span className="font-semibold text-forest">{CATEGORY_LABEL[event.category]}</span>
          <span aria-hidden="true">·</span>
          <span className="truncate">{formatTime(event.startTime)}</span>
        </p>
        <Heading className="mt-1 text-[1.3rem] font-semibold leading-snug">
          <Link href={`/events/${event.slug}`} className="bg-gradient-to-r from-forest to-forest bg-[length:0%_1.5px] bg-left-bottom bg-no-repeat transition-[background-size] duration-300 group-hover:bg-[length:100%_1.5px]">
            {event.title}
          </Link>
        </Heading>
        <p className="mt-1.5 flex items-center gap-1.5 text-sm text-muted">
          <Icon name="pin" className="size-4 shrink-0" />
          <span className="truncate">{event.location}</span>
        </p>
        {showSeats ? (
          <SeatMeter event={event} className="mt-4" />
        ) : (
          event._count.attendances > 0 && <p className="mt-3 text-[0.8125rem] text-muted">{event._count.attendances} people took part</p>
        )}
      </div>
    </article>
  );
}

/** Large lead card used at the top of the home page's upcoming list. */
export function FeaturedEvent({ event }: { event: EventView }) {
  return (
    <article className="group grid overflow-hidden rounded-3xl border border-line bg-white md:grid-cols-[1.25fr_1fr]">
      <Link href={`/events/${event.slug}`} className="relative block min-h-64 overflow-hidden bg-paper" aria-hidden="true" tabIndex={-1}>
        <CoverImage src={event.coverImage} alt="" seed={event.title} eager className="absolute inset-0 size-full transition-transform duration-700 ease-out group-hover:scale-[1.03]" />
        <span className="absolute left-4 top-4">
          <DateChip date={event.date} />
        </span>
      </Link>
      <div className="flex flex-col justify-center p-7 sm:p-10">
        <p className="text-sm font-semibold text-forest">{CATEGORY_LABEL[event.category]} · Next up</p>
        <h3 className="mt-2 text-3xl font-semibold leading-[1.1]">
          <Link href={`/events/${event.slug}`} className="hover:text-forest">{event.title}</Link>
        </h3>
        <p className="mt-3 line-clamp-3 text-muted">{event.description.split("\n")[0]}</p>
        <dl className="mt-5 space-y-1.5 text-[0.9375rem]">
          <div className="flex items-center gap-2"><Icon name="calendar" className="size-4 text-forest" /><dt className="sr-only">When</dt><dd>{formatDate(event.date, { weekday: true })} · {formatTime(event.startTime)}</dd></div>
          <div className="flex items-center gap-2"><Icon name="pin" className="size-4 text-forest" /><dt className="sr-only">Where</dt><dd>{event.location}</dd></div>
        </dl>
        <SeatMeter event={event} className="mt-5 max-w-xs" />
        <div className="mt-6">
          <Link href={`/events/${event.slug}`} className="btn-primary">
            {event.state === "OPEN" ? "Reserve a place" : "View details"} <Icon name="arrow" className="size-4" />
          </Link>
        </div>
      </div>
    </article>
  );
}

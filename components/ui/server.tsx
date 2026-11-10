import Link from "next/link";
import type { EventStatus } from "@prisma/client";
import type { RegistrationState } from "@/lib/event-state";
import { REG_STATE_LABEL, STATUS_LABEL } from "@/lib/event-state";
import { resolveFlash } from "@/lib/flash";
import { Icon, type IconName } from "./icons";
import { Toast } from "./toast";

/** Compact empty state: a calm note, not a big dashed panel. */
export function EmptyState({
  icon = "leaf",
  title,
  children,
  action,
}: {
  icon?: IconName;
  title: string;
  children?: React.ReactNode;
  action?: { href: string; label: string };
}) {
  return (
    <div className="flex flex-col items-start gap-4 rounded-2xl bg-paper px-6 py-8 sm:flex-row sm:items-center sm:px-8">
      <div className="grid size-11 shrink-0 place-items-center rounded-full bg-white text-forest shadow-[inset_0_0_0_1px_var(--color-line)]">
        <Icon name={icon} className="size-5" />
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="font-display text-lg font-semibold leading-snug">{title}</h3>
        {children && <p className="mt-1 max-w-xl text-[0.9375rem] text-muted">{children}</p>}
      </div>
      {action && (
        <Link href={action.href} className="btn-primary btn-sm shrink-0">
          {action.label}
        </Link>
      )}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />;
}

export function Field({
  label,
  name,
  errors,
  hint,
  children,
  required,
}: {
  label: string;
  name: string;
  errors?: string[];
  hint?: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <div>
      <label htmlFor={name} className="label">
        {label}
        {required && (
          <span className="text-clay" aria-hidden="true">
            {" "}
            *
          </span>
        )}
      </label>
      {children}
      {hint && !errors?.length && (
        <p id={`${name}-hint`} className="hint">
          {hint}
        </p>
      )}
      {errors?.length ? (
        <p id={`${name}-error`} role="alert" className="field-error">
          {errors[0]}
        </p>
      ) : null}
    </div>
  );
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div role="alert" className="flex items-start gap-2.5 rounded-lg border border-danger/25 bg-danger-soft px-3.5 py-3 text-sm text-danger">
      <Icon name="warn" className="mt-0.5 size-4 shrink-0" />
      <span className="font-medium">{message}</span>
    </div>
  );
}

/** Renders the flash message from ?notice= / ?error= as an auto-dismissing toast. */
export function Notice({ notice, error }: { notice?: string; error?: string }) {
  if (error) return <Toast kind="error" message={error} />;
  if (notice) return <Toast kind="notice" message={notice} />;
  return null;
}

const DOT = {
  green: "bg-forest",
  amber: "bg-amber",
  grey: "bg-muted/50",
  red: "bg-danger",
  hollow: "bg-transparent ring-1 ring-inset ring-muted/60",
} as const;

function Status({ dot, label, className = "" }: { dot: keyof typeof DOT; label: string; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap text-[0.8125rem] font-semibold text-charcoal ${className}`}>
      <i aria-hidden="true" className={`size-2 rounded-full ${DOT[dot]}`} />
      {label}
    </span>
  );
}

const STATUS_DOT: Record<EventStatus, keyof typeof DOT> = {
  DRAFT: "hollow",
  PUBLISHED: "grey",
  REGISTRATION_OPEN: "green",
  REGISTRATION_CLOSED: "amber",
  FULL: "amber",
  COMPLETED: "grey",
  CANCELLED: "red",
};

export function StatusBadge({ status }: { status: EventStatus }) {
  return <Status dot={STATUS_DOT[status]} label={STATUS_LABEL[status]} />;
}

const STATE_DOT: Record<RegistrationState, keyof typeof DOT> = {
  OPEN: "green",
  CLOSED: "amber",
  FULL: "amber",
  NOT_OPEN: "hollow",
  ENDED: "grey",
  CANCELLED: "red",
};

export function StateBadge({ state, className }: { state: RegistrationState; className?: string }) {
  return <Status dot={STATE_DOT[state]} label={REG_STATE_LABEL[state]} className={className} />;
}

export function PartnerLogo({ name, logo, size = "size-14" }: { name: string; logo?: string | null; size?: string }) {
  if (logo) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={logo} alt={`${name} logo`} className={`${size} rounded-full bg-white object-contain`} />;
  }
  const initials = name
    .split(/\s+/)
    .filter((w) => /^[A-Za-z]/.test(w))
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  return (
    <div aria-hidden="true" className={`${size} grid place-items-center rounded-full border border-line-strong bg-white font-display text-base font-semibold text-forest`}>
      {initials}
    </div>
  );
}

export function SectionHeading({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: React.ReactNode }) {
  return (
    <div className="max-w-2xl">
      {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
      <h2 className="text-3xl font-semibold leading-[1.1] sm:text-4xl">{title}</h2>
      {children && <p className="mt-3 text-lg text-muted">{children}</p>}
    </div>
  );
}

export function flashParams(sp: { notice?: string; error?: string }) {
  return { notice: resolveFlash(sp.notice), error: resolveFlash(sp.error) };
}

/** Initials in a soft circle; the hue is derived from the name so people are visually distinct in long lists. */
export function Avatar({ name, size = "size-8" }: { name: string; size?: string }) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 360;
  return (
    <span
      aria-hidden="true"
      className={`${size} grid shrink-0 place-items-center rounded-full text-[0.7rem] font-semibold`}
      style={{ background: `hsl(${100 + (h % 70)} 28% 90%)`, color: `hsl(${100 + (h % 70)} 40% 24%)` }}
    >
      {initials}
    </span>
  );
}

export function AttendanceStatus({ present }: { present: boolean }) {
  return <Status dot={present ? "green" : "hollow"} label={present ? "Present" : "Not checked in"} />;
}

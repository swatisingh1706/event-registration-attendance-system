"use client";

import { useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import { useFormStatus } from "react-dom";
import { Icon } from "./icons";
import { TopoPattern } from "./topo";

/** Cover/hero image. With no photo (or a broken URL) it falls back to a generated contour pattern seeded by the title. */
export function CoverImage({ src, alt, seed, className = "", eager = false }: { src?: string | null; alt: string; seed?: string; className?: string; eager?: boolean }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div role="img" aria-label={alt || "Event cover"} className={`overflow-hidden ${className}`}>
        <TopoPattern seed={seed || alt} className="size-full" />
      </div>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} loading={eager ? "eager" : "lazy"} decoding="async" onError={() => setFailed(true)} className={`object-cover ${className}`} />;
}

/** Submit button that shows a pending label while the server action runs. */
export function SubmitButton({
  children,
  pending: pendingLabel = "Saving…",
  className = "btn-primary",
  name,
  value,
  busy,
}: {
  children: React.ReactNode;
  pending?: string;
  className?: string;
  name?: string;
  value?: string;
  /** Pass the pending flag from useActionState when the form uses useSubmit(). */
  busy?: boolean;
}) {
  const status = useFormStatus();
  const pending = busy ?? status.pending;
  return (
    <button type="submit" name={name} value={value} disabled={pending} aria-disabled={pending} className={className}>
      {pending ? (
        <>
          <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
          {pendingLabel}
        </>
      ) : (
        children
      )}
    </button>
  );
}

/**
 * Destructive actions always go through an accessible confirmation dialog.
 * The dialog contains its own <form>, so this can sit inside table rows.
 */
export function ConfirmButton({
  action,
  fields,
  label,
  title,
  message,
  confirmLabel = "Confirm",
  triggerClass = "btn-ghost btn-sm",
  danger = false,
}: {
  action: (formData: FormData) => void | Promise<void | { redirectTo: string }>;
  fields: Record<string, string>;
  label: React.ReactNode;
  title: string;
  message: string;
  confirmLabel?: string;
  triggerClass?: string;
  danger?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const { submit, pending } = useNavAction(action, () => ref.current?.close());
  return (
    <>
      <button type="button" className={triggerClass} onClick={() => ref.current?.showModal()}>
        {label}
      </button>
      <dialog
        ref={ref}
        aria-labelledby="confirm-title"
        className="m-auto w-[min(92vw,26rem)] rounded-xl border border-line bg-white p-0 text-charcoal shadow-xl backdrop:bg-charcoal/50"
        onClick={(e) => e.target === ref.current && ref.current?.close()}
      >
        <form className="space-y-4 p-6" onSubmit={submit}>
          {Object.entries(fields).map(([k, v]) => (
            <input key={k} type="hidden" name={k} value={v} />
          ))}
          <h2 id="confirm-title" className="text-lg font-semibold">
            {title}
          </h2>
          <p className="text-sm text-muted">{message}</p>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary btn-sm" onClick={() => ref.current?.close()}>
              Cancel
            </button>
            <SubmitButton busy={pending} className={`${danger ? "btn-danger" : "btn-primary"} btn-sm`} pending="Working…">
              {confirmLabel}
            </SubmitButton>
          </div>
        </form>
      </dialog>
    </>
  );
}

/** Copy-to-clipboard helper button. */
export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => setDone(false), 1800);
    return () => clearTimeout(t);
  }, [done]);
  return (
    <button
      type="button"
      className="btn-secondary btn-sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
        } catch {
          /* clipboard unavailable */
        }
      }}
    >
      <Icon name={done ? "check" : "copy"} className="size-4" />
      {done ? "Copied" : label}
    </button>
  );
}

/**
 * Submit handler that runs a server action inside a transition instead of using <form action>.
 * React 19 resets uncontrolled fields after a form action completes, which would wipe what the
 * user typed when validation fails; going through onSubmit keeps their input in place.
 */
export function useSubmit(action: (formData: FormData) => void) {
  const [, start] = useTransition();
  return (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget, (e.nativeEvent as SubmitEvent).submitter);
    start(() => action(fd));
  };
}

/**
 * Runs a server action in a transition and, if it returns { redirectTo }, navigates from the client.
 * Next's built-in server-action redirect doesn't reliably re-render when the target is the same page with a
 * new query string (our flash banners), so actions return the URL instead of calling redirect().
 */
export function useNavAction(action: (formData: FormData) => void | Promise<void | { redirectTo: string }>, onStart?: () => void) {
  const [pending, start] = useTransition();
  const [target, setTarget] = useState<string | null>(null);
  // A full navigation: client-side router.push from inside these confirm dialogs/table rows was being aborted,
  // and for destructive admin actions a hard reload (fresh data + banner) is the safest behaviour anyway.
  useEffect(() => {
    if (target) {
      window.location.assign(target);
    }
  }, [target]);
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget, (e.nativeEvent as SubmitEvent).submitter);
    onStart?.();
    start(async () => {
      const res = await action(fd);
      if (res && typeof res === "object" && "redirectTo" in res) setTarget(res.redirectTo);
    });
  };
  return { submit, pending };
}

/** A plain form (no confirmation) wired to useNavAction. */
export function ActionForm({
  action,
  children,
  className,
}: {
  action: (formData: FormData) => void | Promise<void | { redirectTo: string }>;
  children: React.ReactNode;
  className?: string;
}) {
  const { submit } = useNavAction(action);
  return (
    <form onSubmit={submit} className={className}>
      {children}
    </form>
  );
}

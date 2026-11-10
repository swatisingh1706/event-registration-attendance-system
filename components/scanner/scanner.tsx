"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/icons";
import type { CheckInResult } from "@/lib/services/checkin";

type EventOption = { id: string; title: string; dateLabel: string };
type Counts = { registered: number; attended: number; rate: number };
type Outcome = (CheckInResult | { status: "ERROR" | "UNAUTHENTICATED" | "RATE_LIMITED" }) & { counts?: Counts };

const READER_ID = "ticket-reader";

export function Scanner({ events, initialEventId }: { events: EventOption[]; initialEventId?: string }) {
  const [eventId, setEventId] = useState(initialEventId ?? events[0]?.id ?? "");
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [checking, setChecking] = useState(false);
  const [sessionCount, setSessionCount] = useState(0);
  const [counts, setCounts] = useState<Counts | null>(null);
  const [manual, setManual] = useState("");

  const scannerRef = useRef<import("html5-qrcode").Html5Qrcode | null>(null);
  const lockRef = useRef(false); // true while a scan is being validated or its result is on screen
  const lastRef = useRef<{ code: string; at: number }>({ code: "", at: 0 });
  const eventIdRef = useRef(eventId);
  eventIdRef.current = eventId;

  const event = events.find((e) => e.id === eventId);

  /** Send the token to the server. The server alone decides whether the person is present. */
  const submit = useCallback(async (code: string, method: "QR_SCAN" | "MANUAL_ID") => {
    setChecking(true);
    try {
      const res = await fetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: eventIdRef.current, code, method }),
      });
      const data = (await res.json().catch(() => ({ status: "ERROR" }))) as Outcome;
      if (res.status === 401) return { status: "UNAUTHENTICATED" } as Outcome;
      if (res.status === 429) return { status: "RATE_LIMITED" } as Outcome;
      if (!res.ok && !("status" in data)) return { status: "ERROR" } as Outcome;
      return data;
    } catch {
      return { status: "ERROR" } as Outcome;
    } finally {
      setChecking(false);
    }
  }, []);

  const handleCode = useCallback(
    async (code: string, method: "QR_SCAN" | "MANUAL_ID") => {
      const now = Date.now();
      if (lockRef.current) return;
      if (lastRef.current.code === code && now - lastRef.current.at < 4000) return;
      lockRef.current = true;
      lastRef.current = { code, at: now };
      const result = await submit(code, method);
      setOutcome(result);
      if (result.counts) setCounts(result.counts);
      if (result.status === "SUCCESS") setSessionCount((n) => n + 1);
      if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(result.status === "SUCCESS" ? 60 : [80, 60, 80]);
    },
    [submit],
  );

  const dismiss = useCallback(() => {
    setOutcome(null);
    setManual("");
    lockRef.current = false; // ready for the next participant
  }, []);

  // Successful check-ins clear themselves so the queue keeps moving.
  useEffect(() => {
    if (outcome?.status !== "SUCCESS") return;
    const t = setTimeout(dismiss, 2800);
    return () => clearTimeout(t);
  }, [outcome, dismiss]);

  // Camera lifecycle
  useEffect(() => {
    if (!scanning) return;
    let cancelled = false;
    (async () => {
      setCameraError(null);
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError("This browser can't access the camera here. Camera scanning needs HTTPS (or localhost). You can enter the ticket ID manually instead.");
        setScanning(false);
        return;
      }
      try {
        const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import("html5-qrcode");
        if (cancelled) return;
        const qr = new Html5Qrcode(READER_ID, { formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE], verbose: false });
        scannerRef.current = qr;
        await qr.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: (w: number, h: number) => {
              const size = Math.floor(Math.min(w, h) * 0.72);
              return { width: size, height: size };
            },
          },
          (text) => void handleCode(text, "QR_SCAN"),
          () => {},
        );
      } catch (err) {
        if (cancelled) return;
        const name = err instanceof Error ? err.name : String(err);
        setCameraError(
          /NotAllowed|Permission/i.test(name + String(err))
            ? "Camera permission was denied. Allow camera access in your browser settings, or enter the ticket ID manually."
            : /NotFound|Devices/i.test(name + String(err))
              ? "No camera was found on this device. You can enter the ticket ID manually."
              : "We couldn't start the camera. You can enter the ticket ID manually.",
        );
        setScanning(false);
      }
    })();
    return () => {
      cancelled = true;
      const qr = scannerRef.current;
      scannerRef.current = null;
      if (qr) qr.stop().then(() => qr.clear()).catch(() => {});
    };
  }, [scanning, handleCode]);

  const changeEvent = () => {
    setScanning(false);
    setOutcome(null);
    lockRef.current = false;
    setCounts(null);
    setSessionCount(0);
  };

  if (!events.length) {
    return (
      <div className="rounded-lg border border-dashed border-mint-deep bg-white p-10 text-center">
        <p className="font-display text-xl font-semibold">No events to check in</p>
        <p className="mt-2 text-sm text-muted">Only published events that haven&apos;t been completed or cancelled can be scanned.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg">
      {!scanning ? (
        <div className="space-y-6">
          <div className="rounded-lg border border-line bg-white p-6">
            <label htmlFor="event" className="label">Check-in event</label>
            <select id="event" value={eventId} onChange={(e) => setEventId(e.target.value)} className="input">
              {events.map((e) => (
                <option key={e.id} value={e.id}>{e.title} — {e.dateLabel}</option>
              ))}
            </select>
            <p className="hint">Tickets for any other event will be rejected as “wrong event”.</p>
            <div className="mt-5">
              <p className="font-display text-xl font-semibold">{event?.title}</p>
              <p className="text-sm text-muted">{event?.dateLabel}</p>
            </div>
            <button type="button" onClick={() => setScanning(true)} className="btn-primary mt-6 w-full py-3.5 text-base">
              <Icon name="camera" /> Start Scanner
            </button>
            {cameraError && (
              <p role="alert" className="mt-4 rounded-lg bg-amber-soft px-4 py-3 text-sm text-amber">
                {cameraError}
              </p>
            )}
          </div>
          <ManualEntry manual={manual} setManual={setManual} disabled={checking || !!outcome} onSubmit={() => void handleCode(manual.trim(), "MANUAL_ID")} open={!!cameraError} checking={checking} />
        </div>
      ) : (
        <div className="space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wider text-muted">Checking in</p>
              <p className="truncate font-display text-lg font-semibold">{event?.title}</p>
            </div>
            <button type="button" onClick={changeEvent} className="btn-secondary btn-sm shrink-0">Change event</button>
          </div>

          <div>
            <h2 className="font-display text-2xl font-semibold">Scan Event Ticket</h2>
            <p className="text-muted">Place the participant&apos;s QR code inside the frame.</p>
          </div>

          <div className="relative overflow-hidden rounded-2xl bg-charcoal shadow-[0_20px_40px_-24px_rgb(29_42_35/0.6)]">
            <div id={READER_ID} className="min-h-72 w-full [&_video]:!w-full [&_video]:!object-cover" />
            <div className="pointer-events-none absolute inset-0 grid place-items-center" aria-hidden="true">
              <div className="relative aspect-square w-[72%] shadow-[0_0_0_9999px_rgba(20,32,26,0.5)]">
                {/* corner brackets */}
                {["left-0 top-0 border-l-4 border-t-4 rounded-tl-xl", "right-0 top-0 border-r-4 border-t-4 rounded-tr-xl", "left-0 bottom-0 border-l-4 border-b-4 rounded-bl-xl", "right-0 bottom-0 border-r-4 border-b-4 rounded-br-xl"].map((c) => (
                  <span key={c} className={`absolute size-9 border-white ${c}`} />
                ))}
                {/* sweeping scan line */}
                <div className="absolute inset-x-3 inset-y-3 overflow-hidden">
                  <div className="animate-scan h-0.5 w-full rounded-full bg-sage shadow-[0_0_14px_3px_rgba(127,175,145,0.8)]" />
                </div>
              </div>
            </div>
            {checking && (
              <div className="absolute inset-x-0 bottom-0 bg-charcoal/80 py-2 text-center text-sm font-semibold text-white" role="status">
                Checking ticket…
              </div>
            )}
          </div>

          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line text-center">
            <div className="bg-white py-3">
              <dd className="font-display text-2xl font-semibold tabular-nums text-forest-dark">{counts ? `${counts.attended} / ${counts.registered}` : "—"}</dd>
              <dt className="text-xs font-semibold uppercase tracking-wider text-muted">Attended / registered</dt>
            </div>
            <div className="bg-white py-3">
              <dd className="font-display text-2xl font-semibold tabular-nums text-forest-dark">{sessionCount}</dd>
              <dt className="text-xs font-semibold uppercase tracking-wider text-muted">Checked in on this device</dt>
            </div>
          </dl>

          <ManualEntry manual={manual} setManual={setManual} disabled={checking || !!outcome} onSubmit={() => void handleCode(manual.trim(), "MANUAL_ID")} checking={checking} />
        </div>
      )}

      {outcome && <ResultSheet outcome={outcome} onNext={dismiss} />}
    </div>
  );
}

function ManualEntry({ manual, setManual, disabled, onSubmit, open, checking }: { manual: string; setManual: (v: string) => void; disabled: boolean; onSubmit: () => void; open?: boolean; checking: boolean }) {
  return (
    <details open={open} className="rounded-lg border border-line bg-white p-5">
      <summary className="-my-3 flex min-h-11 cursor-pointer items-center font-semibold">Enter Ticket ID manually</summary>
      <form
        className="mt-4 space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (manual.trim().length >= 3) onSubmit();
        }}
      >
        <label htmlFor="manual-id" className="label">Registration ID</label>
        <input id="manual-id" value={manual} onChange={(e) => setManual(e.target.value)} placeholder="GBF-2026-00482" autoCapitalize="characters" autoComplete="off" className="input font-mono uppercase" />
        <p className="hint">The ID printed on the participant&apos;s ticket. It goes through the same checks as a QR scan.</p>
        <button className="btn-primary w-full" disabled={disabled || manual.trim().length < 3}>{checking ? "Checking ticket…" : "Check in"}</button>
      </form>
    </details>
  );
}

function ResultSheet({ outcome, onNext }: { outcome: Outcome; onNext: () => void }) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => ref.current?.focus(), []);

  const ok = outcome.status === "SUCCESS";
  const warn = outcome.status === "ALREADY_CHECKED_IN" || outcome.status === "NOT_ACTIVE" || outcome.status === "OUTSIDE_WINDOW" || outcome.status === "WRONG_EVENT" || outcome.status === "CANCELLED_TICKET";
  const tone = ok ? "bg-forest text-white" : warn ? "bg-amber-soft text-amber" : "bg-danger-soft text-danger";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-charcoal/50 p-3 sm:items-center" role="dialog" aria-modal="true" aria-label="Check-in result">
      <div role="status" aria-live="assertive" className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl animate-rise">
        <div className={`flex flex-col items-center px-6 py-8 text-center ${tone}`}>
          <div className={`grid size-16 place-items-center rounded-full ${ok ? "bg-white/20 animate-pop" : "bg-white/70"}`}>
            {ok ? (
              <svg viewBox="0 0 24 24" className="size-9" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path className="check-draw" d="m5 12.5 4.5 4.5L19 7.5" />
              </svg>
            ) : (
              <Icon name={warn ? "warn" : "x"} className="size-8" />
            )}
          </div>
          <p className="mt-4 text-sm font-extrabold uppercase tracking-[0.18em]">{title(outcome)}</p>
        </div>

        <div className="space-y-4 px-6 py-6 text-center">
          <Body outcome={outcome} />
          {"counts" in outcome && outcome.counts && (
            <p className="text-sm text-muted">
              {outcome.counts.attended} of {outcome.counts.registered} attended · {outcome.counts.rate.toFixed(1)}%
            </p>
          )}
          <button ref={ref} type="button" onClick={onNext} className="btn-primary w-full py-3.5 text-base">
            {ok ? "Scan next" : "Try again"}
          </button>
          {ok && <p className="text-xs text-muted">Getting ready for the next participant…</p>}
        </div>
      </div>
    </div>
  );
}

function title(o: Outcome) {
  switch (o.status) {
    case "SUCCESS": return "Check-in successful";
    case "ALREADY_CHECKED_IN": return "Already checked in";
    case "INVALID": return "Invalid ticket";
    case "WRONG_EVENT": return "Wrong event";
    case "CANCELLED_TICKET": return "Ticket cancelled";
    case "NOT_ACTIVE": return "Check-in unavailable";
    case "OUTSIDE_WINDOW": return "Check-in not open";
    case "UNAUTHENTICATED": return "Session expired";
    case "RATE_LIMITED": return "Slow down";
    case "FORBIDDEN": return "Not allowed";
    default: return "Something went wrong";
  }
}

function Body({ outcome: o }: { outcome: Outcome }) {
  switch (o.status) {
    case "SUCCESS":
      return (
        <>
          <p className="text-2xl font-semibold">{o.participant}</p>
          <p className="text-muted">{o.eventTitle}</p>
          <Meta label="Registration ID" value={o.registrationNumber} mono />
          <Meta label="Checked in at" value={o.checkedInAt} />
        </>
      );
    case "ALREADY_CHECKED_IN":
      return (
        <>
          <p className="text-2xl font-semibold">{o.participant}</p>
          <p className="text-muted">This ticket has already been used.</p>
          <Meta label="Checked in at" value={o.checkedInAt} />
        </>
      );
    case "INVALID":
      return <p className="text-lg">This QR code is not associated with a valid registration.</p>;
    case "WRONG_EVENT":
      return (
        <>
          <Meta label="This ticket belongs to" value={o.ticketEvent} />
          <Meta label="Current event" value={o.currentEvent} />
        </>
      );
    case "CANCELLED_TICKET":
      return <p className="text-lg">This registration was cancelled, so the ticket is no longer valid.</p>;
    case "NOT_ACTIVE":
    case "OUTSIDE_WINDOW":
      return <p className="text-lg">{o.message}</p>;
    case "UNAUTHENTICATED":
      return (
        <p className="text-lg">
          Your session has expired. <a href="/login?next=/admin/scanner" className="font-semibold text-forest underline">Log in again</a> to continue.
        </p>
      );
    case "RATE_LIMITED":
      return <p className="text-lg">Too many scans in a short time. Please wait a few seconds.</p>;
    case "FORBIDDEN":
      return <p className="text-lg">You don&apos;t have permission to check people in.</p>;
    default:
      return <p className="text-lg">We couldn&apos;t reach the server. Nothing was recorded — please try again.</p>;
  }
}

function Meta({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-widest text-muted">{label}</p>
      <p className={`text-lg font-semibold ${mono ? "font-mono" : ""}`}>{value}</p>
    </div>
  );
}

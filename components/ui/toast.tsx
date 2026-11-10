"use client";

import { useEffect, useState } from "react";
import { Icon } from "./icons";

/**
 * One-time confirmation / error message shown after an action. Auto-dismisses, can be closed,
 * and clears its ?notice= / ?error= parameters from the address bar so a refresh doesn't repeat it.
 */
export function Toast({ kind, message }: { kind: "notice" | "error"; message: string }) {
  const [open, setOpen] = useState(true);
  useEffect(() => {
    setOpen(true);
    try {
      const url = new URL(window.location.href);
      if (url.searchParams.has("notice") || url.searchParams.has("error")) {
        ["notice", "error", "t"].forEach((k) => url.searchParams.delete(k));
        window.history.replaceState(window.history.state, "", url.pathname + (url.search || ""));
      }
    } catch {
      /* non-critical */
    }
    const id = setTimeout(() => setOpen(false), kind === "error" ? 9000 : 5500);
    return () => clearTimeout(id);
  }, [message, kind]);
  if (!open) return null;
  const isError = kind === "error";
  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[60] flex justify-center px-4">
      <div
        role={isError ? "alert" : "status"}
        className={`animate-toast pointer-events-auto flex max-w-md items-start gap-3 rounded-xl border bg-white py-3 pl-3.5 pr-2 text-sm shadow-[0_12px_36px_-12px_rgb(29_42_35/0.35)] ${
          isError ? "border-danger/40" : "border-forest/30"
        }`}
      >
        <span className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full ${isError ? "bg-danger text-white" : "bg-forest text-white"}`}>
          <Icon name={isError ? "x" : "check"} className="size-3" strokeWidth={3} />
        </span>
        <p className="flex-1 pt-px font-medium text-charcoal">{message}</p>
        <button type="button" onClick={() => setOpen(false)} className="grid size-7 place-items-center rounded-md text-muted hover:bg-paper hover:text-charcoal" aria-label="Dismiss message">
          <Icon name="x" className="size-4" />
        </button>
      </div>
    </div>
  );
}

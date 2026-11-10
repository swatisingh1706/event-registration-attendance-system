"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/icons";

/** Uses the phone's native share sheet when available, otherwise copies the link. */
export function ShareButton({ title, className = "btn-secondary btn-sm" }: { title: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  async function share() {
    const url = window.location.href.split("?")[0];
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        /* cancelled — fall through to copy */
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <button type="button" onClick={share} className={className}>
      <Icon name={copied ? "check" : "share"} className="size-4" />
      <span aria-live="polite">{copied ? "Link copied" : "Share"}</span>
    </button>
  );
}

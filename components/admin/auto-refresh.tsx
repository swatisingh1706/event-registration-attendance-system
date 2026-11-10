"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Re-fetches the server-rendered page on an interval so numbers reflect check-ins made on
 * other devices. This is real polling of PostgreSQL-backed data (no simulated updates).
 */
export function AutoRefresh({ seconds = 15 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    const id = setInterval(tick, seconds * 1000);
    return () => clearInterval(id);
  }, [router, seconds]);
  return (
    <p className="text-xs text-muted" aria-live="off">
      Updates automatically every {seconds} seconds
    </p>
  );
}

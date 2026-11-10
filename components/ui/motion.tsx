"use client";

import { useEffect, useRef, useState } from "react";

/** Fades/slides content in the first time it scrolls into view. Without JS or with reduced motion it simply shows. */
export function Reveal({
  children,
  delay = 0,
  className = "",
  as: Tag = "div",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  as?: "div" | "section" | "li" | "article" | "ul";
}) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      el.classList.add("is-in");
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const Component = Tag as React.ElementType;
  return (
    <Component ref={ref} className={`reveal ${className}`} style={{ "--d": `${delay}ms` } as React.CSSProperties}>
      {children}
    </Component>
  );
}

/** Counts up to `value` once visible. Server-renders the final number so nothing is wrong without JS. */
export function CountUp({ value, duration = 1100, className = "" }: { value: number; duration?: number; className?: string }) {
  const [shown, setShown] = useState(value);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || value === 0 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    let started = false;
    const run = () => {
      started = true;
      const t0 = performance.now();
      const tick = (t: number) => {
        const p = Math.min(1, (t - t0) / duration);
        setShown(Math.round(value * (1 - Math.pow(1 - p, 4))));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      setShown(0);
      raf = requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !started) {
          io.disconnect();
          run();
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [value, duration]);
  return (
    <span ref={ref} className={`tabular-nums ${className}`}>
      {shown.toLocaleString("en-IN")}
    </span>
  );
}

/** "3 days 4 hrs" until an event. The server passes the milliseconds remaining (computed in the NGO's timezone); the client only ticks it down. */
export function Countdown({ ms, className = "" }: { ms: number; className?: string }) {
  const [label, setLabel] = useState(() => format(ms));
  useEffect(() => {
    const t0 = Date.now();
    const id = setInterval(() => setLabel(format(ms - (Date.now() - t0))), 30000);
    return () => clearInterval(id);
  }, [ms]);
  return <span className={className}>{label}</span>;
}

function format(ms: number) {
  if (ms <= 0) return "Happening now";
  const mins = Math.floor(ms / 60000);
  const d = Math.floor(mins / 1440);
  const h = Math.floor((mins % 1440) / 60);
  const m = mins % 60;
  if (d >= 1) return `${d} day${d === 1 ? "" : "s"}${h ? ` ${h} hr${h === 1 ? "" : "s"}` : ""}`;
  return h >= 1 ? `${h} hr${h === 1 ? "" : "s"} ${m} min` : `${m} min`;
}

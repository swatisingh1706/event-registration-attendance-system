"use client";

import { useId, useRef, useState } from "react";

/*
 * Dependency-free SVG/HTML charts driven by PostgreSQL rows.
 * One hue (the brand forest) for the data, a lighter step of the same hue for context, hairline gridlines,
 * thin marks with rounded data-ends, a crosshair/hover readout on every chart, and a table view for each.
 */

const INK = "var(--c-forest)";
const WASH = "var(--c-mint-deep)";
const AXIS = "#5c6a62";
const GRID = "#e6e9e5";

export function Empty({ text = "Nothing to show yet." }: { text?: string }) {
  return <p className="rounded-lg bg-paper px-4 py-10 text-center text-sm text-muted">{text}</p>;
}

/** Title row + chart/table toggle shared by every chart. The table is the always-available non-visual alternative. */
function Frame({ title, subtitle, table, children }: { title: string; subtitle?: string; table: React.ReactNode; children: React.ReactNode }) {
  const [view, setView] = useState<"chart" | "table">("chart");
  const id = useId();
  return (
    <figure>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 id={id} className="font-sans text-[0.9375rem] font-semibold leading-tight">{title}</h2>
          {subtitle && <p className="mt-0.5 text-[0.8125rem] text-muted">{subtitle}</p>}
        </div>
        <button
          type="button"
          aria-pressed={view === "table"}
          onClick={() => setView(view === "chart" ? "table" : "chart")}
          className="-my-1 shrink-0 rounded-md px-2.5 py-2 text-xs font-semibold text-muted transition-colors hover:bg-paper hover:text-charcoal aria-pressed:bg-paper aria-pressed:text-charcoal"
        >
          {view === "chart" ? "View as table" : "View as chart"}
        </button>
      </div>
      <div aria-labelledby={id}>{view === "chart" ? children : table}</div>
    </figure>
  );
}

function Table({ head, rows }: { head: string[]; rows: (string | number)[][] }) {
  return (
    <div className="max-h-72 overflow-auto rounded-lg border border-line">
      <table className="w-full text-sm">
        <thead>
          <tr>{head.map((h, i) => <th key={h} className={`th ${i ? "text-right" : ""}`} scope="col">{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>{r.map((c, j) => <td key={j} className={`td py-2 ${j ? "text-right tabular-nums" : ""}`}>{c}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const niceMax = (max: number) => {
  if (max <= 4) return 4;
  const pow = Math.pow(10, Math.floor(Math.log10(max)));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * pow >= max) return m * pow;
  return max;
};
const compact = (n: number) => (n >= 1000 ? `${+(n / 1000).toFixed(1)}K` : String(n));
const dayLabel = (d: string, long = false) =>
  new Date(`${d}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", ...(long ? { weekday: "short" } : {}), timeZone: "UTC" });

/** Daily series as a line: 2px stroke, 10% wash, ringed end-dot, crosshair + tooltip that snaps to the nearest day. */
export function TrendChart({ data, title, subtitle, unit }: { data: { day: string; count: number }[]; title: string; subtitle?: string; unit: string }) {
  const W = 640, H = 300, L = 38, R = 16, T = 16, B = 28;
  const total = data.reduce((s, d) => s + d.count, 0);
  const [active, setActive] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const n = data.length;
  const max = niceMax(Math.max(...data.map((d) => d.count), 1));
  const x = (i: number) => L + (i * (W - L - R)) / Math.max(1, n - 1);
  const y = (v: number) => T + (1 - v / max) * (H - T - B);
  const line = data.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(d.count).toFixed(1)}`).join("");
  const area = `${line}L${x(n - 1)} ${H - B}L${x(0)} ${H - B}Z`;
  const ticks = [0, max / 2, max];

  function onMove(clientX: number) {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const vx = ((clientX - rect.left) / rect.width) * W;
    setActive(Math.max(0, Math.min(n - 1, Math.round(((vx - L) / (W - L - R)) * (n - 1)))));
  }
  const shown = active ?? n - 1;

  if (!total) return <Frame title={title} subtitle={subtitle} table={<Table head={["Day", unit]} rows={[]} />}><Empty text={`No ${unit.toLowerCase()} in this period yet.`} /></Frame>;

  return (
    <Frame title={title} subtitle={subtitle} table={<Table head={["Day", unit]} rows={[...data].reverse().map((d) => [dayLabel(d.day, true), d.count])} />}>
      <div className="relative">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="w-full touch-pan-y select-none outline-offset-4"
          role="group"
          aria-label={`${title}. ${total} ${unit.toLowerCase()} over ${n} days. Use left and right arrow keys to read each day.`}
          tabIndex={0}
          onPointerMove={(e) => onMove(e.clientX)}
          onPointerLeave={() => setActive(null)}
          onFocus={() => setActive((a) => a ?? n - 1)}
          onBlur={() => setActive(null)}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft") setActive((a) => Math.max(0, (a ?? n - 1) - 1));
            if (e.key === "ArrowRight") setActive((a) => Math.min(n - 1, (a ?? n - 1) + 1));
          }}
        >
          {ticks.map((t) => (
            <g key={t}>
              <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke={GRID} strokeWidth="1" />
              <text x={L - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill={AXIS}>{compact(t)}</text>
            </g>
          ))}
          <path d={area} fill={INK} opacity="0.1" />
          <path d={line} fill="none" stroke={INK} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
          <text x={L} y={H - 8} fontSize="11" fill={AXIS}>{dayLabel(data[0].day)}</text>
          <text x={x(Math.floor((n - 1) / 2))} y={H - 8} fontSize="11" fill={AXIS} textAnchor="middle">{dayLabel(data[Math.floor((n - 1) / 2)].day)}</text>
          <text x={W - R} y={H - 8} fontSize="11" fill={AXIS} textAnchor="end">{dayLabel(data[n - 1].day)}</text>
          {active !== null && <line x1={x(active)} x2={x(active)} y1={T} y2={H - B} stroke="#9aa59d" strokeWidth="1" />}
          <circle cx={x(shown)} cy={y(data[shown].count)} r="4.5" fill={INK} stroke="#fff" strokeWidth="2" />
        </svg>
        {active !== null && (
          <div
            className="pointer-events-none absolute top-0 z-10 w-max min-w-28 rounded-lg border border-line bg-white px-3 py-2 text-xs shadow-[0_8px_24px_-8px_rgb(29_42_35/0.3)]"
            style={{ left: `${(x(active) / W) * 100}%`, transform: active > n * 0.6 ? "translateX(calc(-100% - 10px))" : "translateX(10px)" }}
          >
            <p className="text-muted">{dayLabel(data[active].day, true)}</p>
            <p className="mt-0.5 flex items-center gap-2 text-sm">
              <span className="h-0.5 w-3 rounded-full" style={{ background: INK }} aria-hidden="true" />
              <strong className="font-semibold tabular-nums">{data[active].count}</strong>
              <span className="text-muted">{unit.toLowerCase()}</span>
            </p>
          </div>
        )}
      </div>
      <p className="sr-only" aria-live="polite">{active !== null ? `${dayLabel(data[active].day, true)}: ${data[active].count} ${unit.toLowerCase()}` : ""}</p>
    </Frame>
  );
}

type Row = { key: string; label: string; value: number };

/** Horizontal bars for one measure: ≤10px thick, 4px rounded tip, value at the tip, hover lifts the row. */
export function BarList({ rows, title, subtitle, unit }: { rows: Row[]; title: string; subtitle?: string; unit: string }) {
  const [hot, setHot] = useState<string | null>(null);
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <Frame title={title} subtitle={subtitle} table={<Table head={["Name", unit]} rows={rows.map((r) => [r.label, r.value])} />}>
      {!rows.length ? (
        <Empty />
      ) : (
        <ul className="space-y-3.5">
          {rows.map((r) => {
            const w = (r.value / max) * 86;
            return (
              <li
                key={r.key}
                tabIndex={0}
                onPointerEnter={() => setHot(r.key)}
                onPointerLeave={() => setHot(null)}
                onFocus={() => setHot(r.key)}
                onBlur={() => setHot(null)}
                className={`grid grid-cols-[minmax(0,10rem)_1fr] items-center gap-3 rounded-md text-sm outline-offset-4 transition-opacity ${hot && hot !== r.key ? "opacity-45" : ""}`}
                aria-label={`${r.label}: ${r.value} ${unit.toLowerCase()}`}
              >
                <span className="truncate text-charcoal/90" title={r.label}>{r.label}</span>
                <span className="relative block h-2.5">
                  <span className="absolute inset-y-0 left-0 rounded-r-[4px]" style={{ width: `${Math.max(w, 1.5)}%`, background: INK }} />
                  <span className="absolute top-1/2 -translate-y-1/2 text-[0.8125rem] font-semibold tabular-nums" style={{ left: `calc(${Math.max(w, 1.5)}% + 8px)` }}>{r.value}</span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </Frame>
  );
}

/** Two nested measures per event: registered (light step) with attended (full tone) inside it. */
export function RegisteredVsAttended({ data, title, subtitle }: { data: { id: string; title: string; registered: number; attended: number }[]; title: string; subtitle?: string }) {
  const [hot, setHot] = useState<string | null>(null);
  const max = Math.max(...data.map((d) => d.registered), 1);
  const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);
  return (
    <Frame
      title={title}
      subtitle={subtitle}
      table={<Table head={["Event", "Registered", "Attended", "Rate"]} rows={[...data].reverse().map((d) => [d.title, d.registered, d.attended, `${pct(d.attended, d.registered)}%`])} />}
    >
      {!data.length ? (
        <Empty />
      ) : (
        <>
          <ul className="space-y-4">
            {data.map((d) => {
              const w = (d.registered / max) * 100;
              return (
                <li
                  key={d.id}
                  tabIndex={0}
                  onPointerEnter={() => setHot(d.id)}
                  onPointerLeave={() => setHot(null)}
                  onFocus={() => setHot(d.id)}
                  onBlur={() => setHot(null)}
                  aria-label={`${d.title}: ${d.attended} attended of ${d.registered} registered`}
                  className={`relative rounded-md text-sm outline-offset-4 transition-opacity ${hot && hot !== d.id ? "opacity-45" : ""}`}
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="truncate" title={d.title}>{d.title}</span>
                    <span className="shrink-0 text-[0.8125rem] tabular-nums text-muted"><strong className="font-semibold text-charcoal">{d.attended}</strong> / {d.registered}</span>
                  </div>
                  <div className="mt-1.5 h-2.5">
                    <div className="relative h-full rounded-r-[4px]" style={{ width: `${Math.max(w, 2)}%`, background: WASH }}>
                      <div className="absolute inset-y-0 left-0 rounded-r-[4px]" style={{ width: `${pct(d.attended, d.registered)}%`, background: INK, boxShadow: d.attended ? "2px 0 0 #fff" : undefined }} />
                    </div>
                  </div>
                  {hot === d.id && (
                    <div className="pointer-events-none absolute -top-9 right-0 z-10 rounded-lg border border-line bg-white px-2.5 py-1.5 text-xs shadow-[0_8px_24px_-8px_rgb(29_42_35/0.3)]">
                      <strong className="font-semibold tabular-nums">{pct(d.attended, d.registered)}%</strong> <span className="text-muted">attended</span>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          <p className="mt-5 flex gap-5 text-xs text-muted">
            <span className="inline-flex items-center gap-1.5"><i className="size-2.5 rounded-sm" style={{ background: WASH }} aria-hidden="true" /> Registered</span>
            <span className="inline-flex items-center gap-1.5"><i className="size-2.5 rounded-sm" style={{ background: INK }} aria-hidden="true" /> Attended</span>
          </p>
        </>
      )}
    </Frame>
  );
}


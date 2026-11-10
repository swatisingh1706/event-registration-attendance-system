import { Icon } from "@/components/ui/icons";

/** Sparkline: de-emphasised line, current point in the accent with a surface ring. Renders nothing when there is no signal. */
export function Sparkline({ values, label }: { values: number[]; label: string }) {
  if (!values.some((v) => v > 0)) return null;
  const W = 80, H = 28, P = 3;
  const max = Math.max(...values, 1);
  const n = values.length;
  const x = (i: number) => P + (i * (W - 2 * P)) / Math.max(1, n - 1);
  const y = (v: number) => H - P - (v / max) * (H - 2 * P);
  const d = values.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join("");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-7 w-20" role="img" aria-label={label}>
      <path d={d} fill="none" stroke="#9aa59d" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={x(n - 1)} cy={y(values[n - 1])} r="3" fill="var(--c-forest)" stroke="#fff" strokeWidth="1.5" />
    </svg>
  );
}

/** Signed change versus the previous period. Direction is shown with an icon and sign, never colour alone. */
export function Delta({ now, before, period }: { now: number; before: number; period: string }) {
  if (before === 0 && now === 0) return null;
  const up = now >= before;
  const pct = before === 0 ? null : Math.round(((now - before) / before) * 100);
  return (
    <p className="mt-3 flex flex-wrap items-center gap-x-1.5 text-xs">
      <span className={`inline-flex items-center gap-1 font-semibold ${up ? "text-forest" : "text-clay"}`}>
        <Icon name={up ? "trendup" : "trenddown"} className="size-3.5" />
        {pct === null ? `+${now}` : `${pct > 0 ? "+" : ""}${pct}%`}
      </span>
      <span className="text-muted">vs prior {period}</span>
    </p>
  );
}

/** Stat tile: label, auto-compacted value, optional delta and trend. */
export function StatTile({ label, value, children, trend }: { label: string; value: string | number; children?: React.ReactNode; trend?: React.ReactNode }) {
  const display = typeof value === "number" ? (value >= 10000 ? `${+(value / 1000).toFixed(1)}K` : value.toLocaleString("en-IN")) : value;
  return (
    <div className="relative bg-white px-5 py-5">
      <dt className="text-[0.8125rem] font-medium text-muted">{label}</dt>
      <dd className="mt-1.5">
        <span className="block font-sans text-[2rem] font-semibold leading-none tracking-tight text-charcoal">{display}</span>
        {children}
        {trend && <span className="absolute right-4 top-5 block">{trend}</span>}
      </dd>
    </div>
  );
}

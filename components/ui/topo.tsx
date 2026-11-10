/**
 * A calm contour-line pattern used when an event has no photo yet. It is generated from a seed
 * (the event title), so each event gets its own stable pattern rather than a generic placeholder icon.
 */
function hash(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function ringPath(cx: number, cy: number, r: number, phase: number, wobble: number) {
  const pts: string[] = [];
  const steps = 72;
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const k = 1 + wobble * (Math.sin(a * 2 + phase) * 0.55 + Math.sin(a * 3 - phase * 1.7) * 0.3 + Math.sin(a * 5 + phase * 0.6) * 0.15);
    pts.push(`${i ? "L" : "M"}${(cx + Math.cos(a) * r * k * 1.35).toFixed(1)} ${(cy + Math.sin(a) * r * k).toFixed(1)}`);
  }
  return pts.join("") + "Z";
}

export function TopoPattern({ seed, className = "" }: { seed: string; className?: string }) {
  const h = hash(seed || "event");
  const cx = 120 + (h % 220);
  const cy = 90 + ((h >> 8) % 120);
  const phase = ((h >> 4) % 628) / 100;
  const rings = Array.from({ length: 14 }, (_, i) => ringPath(cx, cy, 16 + i * 17, phase + i * 0.11, 0.06 + i * 0.012));
  return (
    <svg viewBox="0 0 480 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true" className={className}>
      <rect width="480" height="300" fill="var(--c-mint)" />
      <g fill="none" stroke="var(--c-forest)" strokeWidth="1.1" strokeOpacity="0.28">
        {rings.map((d, i) => (
          <path key={i} d={d} strokeOpacity={0.12 + (i % 3) * 0.08} />
        ))}
      </g>
      <circle cx={cx} cy={cy} r="5" fill="var(--c-forest)" fillOpacity="0.55" />
    </svg>
  );
}

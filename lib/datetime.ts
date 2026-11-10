/**
 * Event dates and times are wall-clock values ("22 Oct, 7:30 AM at the venue").
 * They are stored without a timezone: `date` is a DATE column, times are "HH:mm"
 * strings, and the registration deadline is stored as a "naive UTC" timestamp
 * (the wall-clock digits written as if they were UTC).
 *
 * Real instants (check-in time, registration time) are true UTC timestamps and are
 * displayed in APP_TIMEZONE.
 */
export const APP_TZ = process.env.APP_TIMEZONE || "Asia/Kolkata";

/** The current wall-clock time in APP_TZ, as a naive-UTC Date. */
export function nowWall(now: Date = new Date()): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TZ,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(now);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return new Date(Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second")));
}

/** Combine a DATE value and "HH:mm" into a naive-UTC Date. */
export function wallDateTime(date: Date, time: string): Date {
  const [h, m] = time.split(":").map(Number);
  const d = new Date(date);
  d.setUTCHours(h || 0, m || 0, 0, 0);
  return d;
}

export function eventStart(e: { date: Date; startTime: string }) {
  return wallDateTime(e.date, e.startTime);
}
export function eventEnd(e: { date: Date; endTime: string }) {
  return wallDateTime(e.date, e.endTime);
}

export function durationHours(startTime: string, endTime: string): number {
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  return Math.max(0, (eh * 60 + em - (sh * 60 + sm)) / 60);
}

export function formatDate(date: Date, opts?: { short?: boolean; weekday?: boolean }): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    day: "numeric",
    month: opts?.short ? "short" : "long",
    year: "numeric",
    weekday: opts?.weekday ? "long" : undefined,
  }).format(date);
}

/** "07:30" -> "7:30 AM" */
export function formatTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}

export function formatTimeRange(start: string, end: string) {
  return `${formatTime(start)} – ${formatTime(end)}`;
}

/** Format a real instant in the NGO's timezone. */
export function formatInstantTime(d: Date): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: APP_TZ, hour: "numeric", minute: "2-digit" }).format(d);
}
export function formatInstantDateTime(d: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: APP_TZ,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(d);
}
export function formatInstantDate(d: Date): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: APP_TZ, day: "numeric", month: "short", year: "numeric" }).format(d);
}

/** Naive-UTC deadline shown as a wall-clock string. */
export function formatDeadline(d: Date): string {
  return `${formatDate(d, { short: true })}, ${formatTime(d.toISOString().slice(11, 16))}`;
}

/** yyyy-mm-dd for <input type="date"> from a DATE value. */
export function toDateInput(d: Date) {
  return d.toISOString().slice(0, 10);
}
/** yyyy-mm-ddTHH:mm for <input type="datetime-local"> from a naive-UTC value. */
export function toDateTimeInput(d: Date) {
  return d.toISOString().slice(0, 16);
}
export function greeting(now: Date = new Date()): string {
  const h = nowWall(now).getUTCHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

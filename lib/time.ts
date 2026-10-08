import type { Job } from "@/data/types";

export const MIN = 60_000;
export const HOUR = 3_600_000;

/** Midnight at the start of the current local day, as epoch ms. */
export const dayStart = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); };

export const reportTimeOf = (job: Pick<Job, "reportTime">) => job.reportTime ?? "08:00";
export const shiftHoursOf = (job: Pick<Job, "shiftHours">) => job.shiftHours ?? 8;
export function reportAt(job: Pick<Job, "reportTime">) {
  const [h, m] = reportTimeOf(job).split(":").map(Number);
  return dayStart() + h * HOUR + m * MIN;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** "8:05 AM" in the viewer's local time. */
export function fmtClock(ms: number) {
  const d = new Date(ms);
  const h = d.getHours(), m = d.getMinutes();
  return `${h % 12 === 0 ? 12 : h % 12}:${pad(m)} ${h < 12 ? "AM" : "PM"}`;
}
export const fmtHM = (ms: number) => { const d = new Date(ms); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };

/** "2h 10m" */
export function fmtDur(ms: number) {
  const mins = Math.max(0, Math.round(ms / MIN));
  const h = Math.floor(mins / 60), m = mins % 60;
  return h ? `${h}h ${pad(m)}m` : `${m}m`;
}
/** "02:10:35" for the live work timer */
export function fmtTimer(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
}

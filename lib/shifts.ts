import type { AttendanceMark, Job, Shift, ShiftStatus } from "@/data/types";
import { workerById } from "@/data/workers";
import { TODAY } from "./format";
import { HOUR, MIN, reportAt, shiftHoursOf } from "./time";

export const shiftId = (jobId: string, workerId: string, date = TODAY) => `${jobId}:${workerId}:${date}`;

/** A shift that has not started yet. */
export function blankShift(job: Job, workerId: string, date = TODAY): Shift {
  return { id: shiftId(job.id, workerId, date), jobId: job.id, workerId, date, status: "scheduled", events: [], breaks: [], proofs: [] };
}

export const breakMs = (s: Shift, now: number) => s.breaks.reduce((t, b) => t + Math.max(0, (b.end ?? now) - b.start), 0);

/** Time actually worked, excluding breaks. */
export function workedMs(s: Shift, now: number) {
  if (s.checkInAt === undefined) return 0;
  const end = s.checkOutAt ?? now;
  return Math.max(0, end - s.checkInAt - breakMs(s, now));
}

export type Bucket = "notStarted" | "onTheWay" | "onSite" | "finished";
export function bucketOf(status: ShiftStatus): Bucket {
  if (status === "on_the_way") return "onTheWay";
  if (status === "arrived" || status === "working" || status === "break") return "onSite";
  if (status === "done" || status === "approved" || status === "disputed") return "finished";
  return "notStarted";
}

/** True when the worker has not set off well after the reporting time. */
export const isOverdue = (job: Job, s: Shift, now: number) => s.status === "scheduled" && now > reportAt(job) + 15 * MIN;

/** Suggested attendance for a finished day, based on hours worked. */
export function suggestMark(job: Job, s: Shift): AttendanceMark {
  const h = workedMs(s, s.checkOutAt ?? 0) / HOUR;
  const need = shiftHoursOf(job);
  return h >= need * 0.75 ? "P" : h >= need * 0.35 ? "H" : "A";
}

export const lateMinutes = (job: Job, s: Shift) => {
  if (s.checkInAt === undefined) return 0;
  const m = Math.floor((s.checkInAt - reportAt(job)) / MIN);
  return m > 10 ? m : 0;
};

export const workerName = (id: string) => workerById(id).name;

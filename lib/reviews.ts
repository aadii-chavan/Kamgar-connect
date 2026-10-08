import type { Application, Job, Review, ReviewBy } from "@/data/types";
import { TODAY, toUTC } from "./format";

/** Reviews stay hidden until both sides have submitted, or this many days after the job ends (the database enforces the same rule). */
export const REVEAL_DAYS = 45;

export const WORKER_CRITERIA = ["Work quality", "Punctuality", "Behaviour and teamwork"] as const;
export const CONTRACTOR_CRITERIA = ["Pays on time", "Safe site", "Respectful behaviour"] as const;
export const criteriaFor = (by: ReviewBy) => (by === "contractor" ? WORKER_CRITERIA : CONTRACTOR_CRITERIA);

export const jobEnded = (job: Job) => !!job.closed || job.endDate < TODAY;
export const daysSince = (iso: string) => Math.round((toUTC(TODAY) - toUTC(iso)) / 86400000);

/** A review becomes public when both sides have submitted, or the wait is over. The database decides and marks each review. */
export function isRevealed(reviews: Review[], job: Job | undefined, jobId: string, workerId: string) {
  const mine = reviews.filter((r) => r.jobId === jobId && r.workerId === workerId);
  return mine.some((r) => r.revealed) || (!!job && daysSince(job.endDate) >= REVEAL_DAYS);
}

/** Public reviews about a worker, written by contractors. */
export const reviewsAboutWorker = (reviews: Review[], jobs: Job[], workerId: string) =>
  reviews
    .filter((r) => r.by === "contractor" && r.workerId === workerId && isRevealed(reviews, jobs.find((j) => j.id === r.jobId), r.jobId, r.workerId))
    .sort((a, b) => b.date.localeCompare(a.date));

/** Public reviews about the contractor, written by workers. */
export const reviewsAboutContractor = (reviews: Review[], jobs: Job[], contractorId?: string) =>
  reviews
    .filter((r) => r.by === "worker" && (!contractorId || jobs.find((j) => j.id === r.jobId)?.contractorId === contractorId) && isRevealed(reviews, jobs.find((j) => j.id === r.jobId), r.jobId, r.workerId))
    .sort((a, b) => b.date.localeCompare(a.date));

export interface Stats { avg: number | null; count: number; dist: [number, number, number, number, number] }
export function statsOf(list: Review[]): Stats {
  const dist: Stats["dist"] = [0, 0, 0, 0, 0];
  list.forEach((r) => { dist[r.rating - 1] += 1; });
  return { avg: list.length ? Math.round((list.reduce((s, r) => s + r.rating, 0) / list.length) * 10) / 10 : null, count: list.length, dist };
}

export type ReviewState =
  | { state: "done"; review: Review }
  | { state: "open" }
  | { state: "locked"; reason: "notEnded" | "notWorked" };

/** Can this side review the other for this job right now? Only people who actually worked together, after the job ended, once. */
export function reviewState(job: Job, workerId: string, by: ReviewBy, applications: Application[], reviews: Review[]): ReviewState {
  const worked = applications.some((a) => a.jobId === job.id && a.workerId === workerId && a.status === "accepted");
  if (!worked) return { state: "locked", reason: "notWorked" };
  const mine = reviews.find((r) => r.jobId === job.id && r.workerId === workerId && r.by === by);
  if (mine) return { state: "done", review: mine };
  if (!jobEnded(job)) return { state: "locked", reason: "notEnded" };
  return { state: "open" };
}

/** Reviews this side still owes, across all jobs. */
export function pendingReviews(by: ReviewBy, jobs: Job[], applications: Application[], reviews: Review[], workerId?: string) {
  const out: { job: Job; workerId: string }[] = [];
  for (const a of applications) {
    if (a.status !== "accepted" || (workerId && a.workerId !== workerId)) continue;
    const job = jobs.find((j) => j.id === a.jobId);
    if (job && reviewState(job, a.workerId, by, applications, reviews).state === "open") out.push({ job, workerId: a.workerId });
  }
  return out;
}

/** Did the other side already review, so mine unlocks theirs? */
export const counterpartWaiting = (reviews: Review[], jobId: string, workerId: string, by: ReviewBy) =>
  reviews.some((r) => r.jobId === jobId && r.workerId === workerId && r.by !== by) && !reviews.some((r) => r.jobId === jobId && r.workerId === workerId && r.by === by);

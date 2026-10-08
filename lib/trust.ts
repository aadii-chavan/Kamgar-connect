import type { Application, Job, WorkerProfile } from "@/data/types";
import { TODAY } from "./format";

export type TrustLevel = "starter" | "good" | "strong" | "verified";

export interface CheckItem { id: string; label: string; hint: string; points: number; earned: number; done: boolean; href?: string }

/** The profile checklist. Points add up to 100. (Document uploads are planned for a later release.) */
export function checklist(p: WorkerProfile): CheckItem[] {
  const withImages = p.works.filter((w) => w.images.length > 0).length;
  const worksPts = Math.min(20, Math.round(withImages * 20 / 3));
  return [
    { id: "basics", label: "Basic details", hint: "Name, area, skill and experience", points: 30, earned: p.onboarded ? 30 : 0, done: p.onboarded },
    { id: "photo", label: "Profile photo", hint: "A clear face photo builds trust", points: 15, earned: p.photo ? 15 : 0, done: !!p.photo },
    { id: "about", label: "About you", hint: "Tell contractors about your work in a few lines", points: 10, earned: p.about.trim().length >= 20 ? 10 : 0, done: p.about.trim().length >= 20 },
    { id: "upi", label: "Payout details", hint: "Add your UPI ID to get paid faster", points: 15, earned: p.upi.trim() ? 15 : 0, done: !!p.upi.trim() },
    { id: "works", label: "Photos of past work", hint: "Add at least 3 projects with photos", points: 20, earned: worksPts, done: withImages >= 3 },
    { id: "references", label: "A reference", hint: "A contractor who can vouch for you", points: 10, earned: p.references.length ? 10 : 0, done: p.references.length > 0 },
  ];
}

export const scoreOf = (p: WorkerProfile) => checklist(p).reduce((s, c) => s + c.earned, 0);

export function levelOf(score: number): TrustLevel {
  return score >= 90 ? "verified" : score >= 70 ? "strong" : score >= 40 ? "good" : "starter";
}
export const LEVEL_LABEL: Record<TrustLevel, string> = {
  starter: "Getting started", good: "Good profile", strong: "Strong profile", verified: "Complete profile",
};
export const LEVEL_TONE: Record<TrustLevel, "slate" | "amber" | "blue" | "green"> = {
  starter: "slate", good: "amber", strong: "blue", verified: "green",
};

/** What a contractor sees about a worker. */
export interface TrustSummary {
  score: number;
  level: TrustLevel;
  refs: number;
  works: { id: string; title: string; area: string; year: number; images: string[]; skill: string; description?: string }[];
  about?: string;
  photo?: string;
  upi: boolean;
  availability?: WorkerProfile["availability"];
  rate?: number;
}

/** What a contractor sees for a worker with no profile on record: nothing verified, nothing shown. */
function blank(): TrustSummary {
  return { score: 0, level: "starter", refs: 0, upi: false, works: [] };
}

/** Profiles of other workers, loaded by the store, so a contractor sees what the worker has shared. */
const others = new Map<string, WorkerProfile>();
export function registerWorkerProfiles(map: Record<string, WorkerProfile>) {
  others.clear();
  for (const [id, p] of Object.entries(map)) others.set(id, p);
}

export function trustFor(workerId: string, own: WorkerProfile | null, myId: string): TrustSummary {
  const p = workerId === myId ? own : others.get(workerId);
  if (!p || !p.onboarded) return blank();
  const score = scoreOf(p);
  return {
    score, level: levelOf(score), refs: p.references.length, upi: !!p.upi,
    works: p.works.map((w) => ({ id: w.id, title: w.title, area: w.area, year: w.year, images: w.images, skill: w.skill, description: w.description })),
    about: p.about, photo: p.photo, availability: p.availability, rate: p.rate,
  };
}

/** Jobs a worker has done (or is doing) through Kamgar, confirmed by the contractor. */
export function kamgarJobs(workerId: string, applications: Application[], jobs: Job[]) {
  const today = TODAY;
  return applications
    .filter((a) => a.workerId === workerId && a.status === "accepted")
    .map((a) => jobs.find((j) => j.id === a.jobId))
    .filter((j): j is Job => !!j && j.startDate <= today)
    .sort((a, b) => b.startDate.localeCompare(a.startDate));
}

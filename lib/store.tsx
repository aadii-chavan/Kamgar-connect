"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { contractor, registerContractors, setCurrentUserId } from "@/data/jobs";
import { registerWorkers, workerById, workers } from "@/data/workers";
import type {
  AppNotification, ContractorProfile, ProofPhoto, Site, Shift, Review, WorkerProfile, Application, ApplicationStatus, AttendanceMark, Job, JobStatus, PayMode, PaymentRecord,
} from "@/data/types";
import * as db from "./db";
import { TODAY, addDays, daysInclusive, setFormatLang, type Lang } from "./format";
import { blankShift, lateMinutes, shiftId, workedMs, workerName } from "./shifts";
import { workerHref } from "./links";
import { createClient } from "./supabase/client";
import { HOUR } from "./time";
import { registerWorkerProfiles } from "./trust";

export type { Lang };
export type Role = "contractor" | "worker";

export function emptyProfile(): WorkerProfile {
  return {
    onboarded: false, phoneVerified: false, name: "", phone: "", birthYear: null, area: "", nativePlace: "",
    skill: "", otherSkills: [], experience: 0, languages: [], rate: 0, availability: "now", about: "",
    emergencyName: "", emergencyPhone: "", upi: "", docs: {}, works: [], references: [],
  };
}

export function emptyContractorProfile(): ContractorProfile {
  return {
    onboarded: false, phoneVerified: false, ownerName: "", phone: "", company: "", kind: "firm",
    yearsInBusiness: 0, teamSize: "6-20", city: "", areas: [], trades: [], about: "", officeAddress: "", gst: "", upi: "", pledge: false, docs: {},
  };
}

/** The role set by the server (app_metadata); the sign-up choice is only used until the server has set it. */
const roleOf = (u: User | null): Role | null => {
  const r = u?.app_metadata?.role ?? u?.user_metadata?.role;
  return r === "contractor" || r === "worker" ? r : null;
};

/** The shared contractor record follows the signed-in contractor's profile once it exists. */
function syncContractorRecord(p: ContractorProfile) {
  const name = p.ownerName || "Contractor";
  Object.assign(contractor, {
    name, company: p.company || name, city: p.city, phone: p.phone,
    initials: name.split(" ").map((x) => x[0]).slice(0, 2).join("").toUpperCase(),
  });
}

/** The directory entry for the signed-in worker follows their profile. */
function syncWorkerRecord(id: string, p: WorkerProfile) {
  const prev = workerById(id);
  registerWorkers([{ ...prev, id, name: p.name || "Worker", skill: p.skill, area: p.area, experience: p.experience, languages: p.languages, phone: p.phone }]);
}

/* ---------- pure helpers ---------- */

export function jobDays(job: Job) {
  const end = job.endDate < TODAY ? job.endDate : TODAY;
  return daysInclusive(job.startDate, end);
}

export function earnedFor(job: Job, daysWorked: number) {
  if (job.payType === "fixed") return daysWorked > 0 ? job.amount : 0;
  if (job.payType === "hourly") return Math.round(daysWorked * 8 * job.amount);
  return Math.round(daysWorked * job.amount);
}

export function estimateTotal(payType: Job["payType"], amount: number, workers: number, days: number) {
  if (payType === "fixed") return workers * amount;
  if (payType === "hourly") return workers * days * 8 * amount;
  return workers * days * amount;
}

export type PayStatus = "paid" | "pending" | "overdue";
export interface PayrollRow {
  key: string;
  job: Job;
  workerId: string;
  days: number;
  amount: number;
  status: PayStatus;
  paidOn?: string;
  mode?: PayMode;
  confirmed?: boolean;
}

/* ---------- store ---------- */

interface Store {
  jobs: Job[];
  applications: Application[];
  payments: Record<string, PaymentRecord>;
  lang: Lang;
  setLang: (l: Lang) => void;
  addJob: (j: Omit<Job, "id" | "postedOn" | "contractorId">) => Promise<Job>;
  closeJob: (id: string) => void;
  setApplicationStatus: (id: string, s: ApplicationStatus) => void;
  filled: (jobId: string) => number;
  statusOf: (job: Job) => JobStatus;
  getMark: (job: Job, workerId: string, date: string) => AttendanceMark | undefined;
  setMark: (job: Job, workerId: string, date: string, m: AttendanceMark | "none") => void;
  acceptedWorkers: (jobId: string) => string[];
  payroll: PayrollRow[];
  markPaid: (rows: PayrollRow[], mode: PayMode) => void;
  /** undefined while the saved session is still being read, null when signed out. */
  session: Role | null | undefined;
  /** The signed-in account's id. */
  userId: string | null;
  /** Name and email of the signed-in account. */
  account: { name: string; email: string } | null;
  logout: () => Promise<void>;
  applyToJob: (jobId: string, workerId: string) => Promise<Application>;
  withdrawApplication: (id: string) => void;
  /** The signed-in worker's own profile. */
  profile: WorkerProfile;
  /** False until the profile and data have been loaded, so screens can avoid flashing the wrong state. */
  profileReady: boolean;
  updateProfile: (fn: (p: WorkerProfile) => WorkerProfile) => void;
  /** The signed-in contractor's business profile. */
  contractorProfile: ContractorProfile;
  /** Business profiles of every contractor whose jobs the signed-in user can see. */
  contractorProfiles: Record<string, ContractorProfile>;
  updateContractorProfile: (fn: (p: ContractorProfile) => ContractorProfile) => void;
  sites: Site[];
  addSite: (s: Omit<Site, "id" | "createdOn" | "contractorId">) => Promise<Site>;
  updateSite: (id: string, patch: Partial<Site>) => Promise<void>;
  removeSite: (id: string) => void;
  reviews: Review[];
  /** Reviews are final: one per side per job, no edits. */
  submitReview: (r: Pick<Review, "jobId" | "workerId" | "rating" | "criteria" | "comment" | "jobTitle" | "by">) => Promise<void>;

  /* ----- live day-of workflow ----- */
  shifts: Record<string, Shift>;
  /** Today's shift for a worker on a job (a blank one if it has not started). */
  shiftOf: (job: Job, workerId: string) => Shift;
  worker: {
    startJourney: (job: Job) => void;
    atSite: (job: Job) => void;
    checkIn: (job: Job) => void;
    startBreak: (job: Job) => void;
    endBreak: (job: Job) => void;
    addProof: (job: Job, p: Omit<ProofPhoto, "id" | "at">) => Promise<void>;
    removeProof: (job: Job, id: string) => void;
    checkOut: (job: Job, note: string) => void;
    resubmit: (job: Job, reply: string) => void;
  };
  approveShift: (job: Job, workerId: string, mark: AttendanceMark, note?: string) => void;
  disputeShift: (job: Job, workerId: string, reason: string) => void;
  notifications: AppNotification[];
  markNotificationsRead: () => void;
  confirmPayment: (key: string) => void;
  /** Ask the contractor to pay (sends them a notification). */
  remindPayment: (key: string) => void;
  /** Flag a review for the team to check. */
  reportReview: (id: string) => Promise<void>;
  /** The latest problem saving or loading data, to show once. */
  notice: { id: number; message: string } | null;
  refresh: () => Promise<void>;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [payments, setPayments] = useState<Record<string, PaymentRecord>>({});
  const [attendance, setAttendance] = useState<Record<string, AttendanceMark>>({});
  const [session, setSession] = useState<Role | null | undefined>(undefined);
  const [userId, setUserId] = useState<string | null>(null);
  const [account, setAccount] = useState<Store["account"]>(null);
  const [profile, setProfile] = useState<WorkerProfile>(emptyProfile);
  const [profileReady, setProfileReady] = useState(false);
  const [contractorProfile, setContractorProfile] = useState<ContractorProfile>(emptyContractorProfile);
  const [contractorProfiles, setContractorProfiles] = useState<Record<string, ContractorProfile>>({});
  const [sites, setSites] = useState<Site[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [shifts, setShifts] = useState<Record<string, Shift>>({});
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [notice, setNotice] = useState<Store["notice"]>(null);
  const [lang, setLangState] = useState<Lang>("en");
  setFormatLang(lang);

  const uid = useRef<string | null>(null);
  const role = useRef<Role | null>(null);
  const writes = useRef(0);                         // saves in flight; a refresh waits for them
  const queue = useRef<Promise<unknown>>(Promise.resolve());   // shift writes run one after another
  const shiftsRef = useRef(shifts);
  const profileRef = useRef(profile); const savedProfile = useRef<WorkerProfile>(profile);
  const contractorRef = useRef(contractorProfile); const savedContractor = useRef<ContractorProfile>(contractorProfile);
  const dirty = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const noticeId = useRef(0);

  const fail = useCallback((e: unknown) => {
    const message = e instanceof Error ? e.message : "Something went wrong. Please try again.";
    setNotice({ id: ++noticeId.current, message });
  }, []);

  /** Run a save, remember it is in flight, and report any failure. */
  const track = useCallback(async <T,>(fn: () => Promise<T>): Promise<T | undefined> => {
    writes.current += 1;
    try { return await fn(); } catch (e) { fail(e); return undefined; } finally { writes.current -= 1; if (writes.current === 0) void refreshRef.current(); }
  }, [fail]);
  const inQueue = useCallback((fn: () => Promise<unknown>) => {
    queue.current = queue.current.then(() => track(fn));
  }, [track]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try { localStorage.setItem("kamgar-lang", l); } catch { /* storage unavailable */ }
  }, []);
  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("lang");
    let saved: string | null = null;
    try { saved = localStorage.getItem("kamgar-lang"); } catch { /* ignore */ }
    const pick = [fromUrl, saved].find((v) => v === "en" || v === "hi" || v === "mr");
    if (pick) setLangState(pick as Lang);
  }, []);
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);

  /* ----- loading ----- */

  const refreshRef = useRef<() => Promise<void>>(async () => {});
  const refresh = useCallback(async () => {
    const id = uid.current, r = role.current;
    if (!id || !r || writes.current > 0) return;
    try {
      const b = await db.loadBundle(id, r);
      if (uid.current !== id) return;
      registerWorkers(b.workers); registerContractors(b.contractors); registerWorkerProfiles(b.workerProfiles);
      setJobs(b.jobs); setApplications(b.applications); setSites(b.sites); setPayments(b.payments); setAttendance(b.attendance);
      shiftsRef.current = b.shifts; setShifts(b.shifts); setReviews(b.reviews); setNotifications(b.notifications); setContractorProfiles(b.contractorProfiles);
      if (!dirty.current) {
        if (b.ownWorker) { const p = { ...emptyProfile(), ...b.ownWorker, name: b.ownWorker.name || b.fullName }; savedProfile.current = p; profileRef.current = p; syncWorkerRecord(id, p); setProfile(p); }
        if (b.ownContractor) { const p = { ...emptyContractorProfile(), ...b.ownContractor, ownerName: b.ownContractor.ownerName || b.fullName }; savedContractor.current = p; contractorRef.current = p; syncContractorRecord(p); setContractorProfile(p); }
      }
      setProfileReady(true);
    } catch (e) { fail(e); setProfileReady(true); }
  }, [fail]);
  refreshRef.current = refresh;

  const clearAll = useCallback(() => {
    uid.current = null; role.current = null; setCurrentUserId("");
    workers.length = 0; registerContractors([]); registerWorkerProfiles({});
    setJobs([]); setApplications([]); setSites([]); setPayments({}); setAttendance({}); shiftsRef.current = {}; setShifts({});
    setReviews([]); setNotifications([]); setContractorProfiles({});
    const p = emptyProfile(), c = emptyContractorProfile();
    profileRef.current = savedProfile.current = p; contractorRef.current = savedContractor.current = c; setProfile(p); setContractorProfile(c);
    dirty.current = false;
  }, []);

  // The signed-in account (Supabase auth) decides the role and whose data is loaded.
  useEffect(() => {
    const supabase = createClient();
    const apply = (user: User | null) => {
      const r = roleOf(user);
      if (!user || !r) { clearAll(); setUserId(null); setAccount(null); setSession(null); setProfileReady(true); return; }
      if (uid.current === user.id && role.current === r) return;      // token refresh etc.
      clearAll();
      uid.current = user.id; role.current = r; setCurrentUserId(user.id);
      setUserId(user.id); setProfileReady(false);
      setAccount({ name: String(user.user_metadata?.full_name ?? ""), email: user.email ?? "" });
      setSession(r);
      void refreshRef.current();
    };
    supabase.auth.getUser().then((res: { data: { user: User | null } }) => apply(res.data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_e: string, s: Session | null) => apply(s?.user ?? null));
    return () => sub.subscription.unsubscribe();
  }, [clearAll]);

  // Live updates: refresh when anything changes on the server, when the tab comes back, and every 30 seconds as a fallback.
  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const soon = () => { clearTimeout(timer); timer = setTimeout(() => void refreshRef.current(), 400); };
    const channel = supabase.channel(`kamgar-${userId}`).on("postgres_changes", { event: "*", schema: "public" }, soon).subscribe();
    const onVisible = () => { if (document.visibilityState === "visible") soon(); };
    document.addEventListener("visibilitychange", onVisible);
    const poll = setInterval(soon, 30_000);
    return () => { clearTimeout(timer); clearInterval(poll); document.removeEventListener("visibilitychange", onVisible); void supabase.removeChannel(channel); };
  }, [userId]);

  /* ----- profiles ----- */

  const flushProfiles = useCallback(async () => {
    clearTimeout(saveTimer.current); saveTimer.current = undefined;
    const id = uid.current;
    if (!id || !dirty.current) return;
    dirty.current = false;
    if (role.current === "worker") {
      const next = profileRef.current, prev = savedProfile.current;
      const saved = await track(() => db.saveWorkerProfile(id, prev, next));
      if (saved) {
        savedProfile.current = { ...next, photo: saved.photo, works: saved.works };
        // Swap uploaded pictures for their addresses without touching anything the user has typed since.
        profileRef.current = { ...profileRef.current, photo: saved.photo, works: profileRef.current.works.map((w) => saved.works.find((x) => x.id === w.id) ?? w) };
        setProfile(profileRef.current);
      } else dirty.current = true;
    } else {
      const next = contractorRef.current, prev = savedContractor.current;
      const saved = await track(() => db.saveContractorProfile(id, prev, next));
      if (saved) { savedContractor.current = { ...next, logo: saved.logo }; contractorRef.current = { ...contractorRef.current, logo: saved.logo }; setContractorProfile(contractorRef.current); }
      else dirty.current = true;
    }
  }, [track]);
  const scheduleSave = useCallback(() => {
    dirty.current = true;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => void flushProfiles(), 700);
  }, [flushProfiles]);
  useEffect(() => {
    const onHide = () => { if (document.visibilityState === "hidden") void flushProfiles(); };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [flushProfiles]);

  const updateProfile = useCallback((fn: (p: WorkerProfile) => WorkerProfile) => {
    const next = fn(profileRef.current);
    profileRef.current = next; setProfile(next);
    if (uid.current) syncWorkerRecord(uid.current, next);
    scheduleSave();
  }, [scheduleSave]);
  const updateContractorProfile = useCallback((fn: (p: ContractorProfile) => ContractorProfile) => {
    const next = fn(contractorRef.current);
    contractorRef.current = next; setContractorProfile(next);
    syncContractorRecord(next);
    scheduleSave();
  }, [scheduleSave]);

  const logout = useCallback(async () => {
    await flushProfiles();
    await createClient().auth.signOut();
    clearAll(); setUserId(null); setAccount(null); setSession(null);
  }, [flushProfiles, clearAll]);

  /* ----- notifications ----- */

  const notify = useCallback((to: string | undefined, key: string, vars: AppNotification["vars"] = {}, href?: string) => {
    if (!to || to === uid.current) return;
    void db.insertNotification(to, key, vars, href);
  }, []);
  const markNotificationsRead = useCallback(() => {
    const id = uid.current;
    if (!id) return;
    setNotifications((p) => (p.some((n) => !n.read) ? p.map((n) => ({ ...n, read: true })) : p));
    void db.markAllRead(id);
  }, []);

  /* ----- jobs and applications ----- */

  const filled = useCallback(
    (jobId: string) => applications.filter((a) => a.jobId === jobId && a.status === "accepted").length,
    [applications],
  );
  const statusOf = useCallback(
    (job: Job): JobStatus => (job.closed ? "closed" : filled(job.id) >= job.needed ? "filled" : "open"),
    [filled],
  );
  const acceptedWorkers = useCallback(
    (jobId: string) => applications.filter((a) => a.jobId === jobId && a.status === "accepted").map((a) => a.workerId),
    [applications],
  );

  const addJob: Store["addJob"] = useCallback(async (j) => {
    const job = await db.insertJob({ ...j, contractorId: uid.current! });
    setJobs((p) => [job, ...p]);
    return job;
  }, []);
  const closeJob = useCallback((id: string) => {
    const job = jobs.find((j) => j.id === id);
    setJobs((p) => p.map((j) => (j.id === id ? { ...j, closed: true } : j)));
    void track(() => db.closeJobRow(id));
    if (job) applications.filter((a) => a.jobId === id && a.status === "accepted").forEach((a) => notify(a.workerId, "{job} is complete. You can now rate the contractor.", { job: job.title }, "/worker/profile"));
  }, [jobs, applications, notify, track]);

  const applyToJob = useCallback(async (jobId: string, workerId: string): Promise<Application> => {
    const app = await db.insertApplication(jobId, workerId);
    setApplications((p) => [app, ...p]);
    const job = jobs.find((j) => j.id === jobId);
    notify(job?.contractorId, "{name} applied for {job}", { name: workerName(workerId), job: job?.title ?? "" }, "/applicants?status=pending");
    return app;
  }, [jobs, notify]);
  const withdrawApplication = useCallback((id: string) => {
    setApplications((p) => p.filter((a) => a.id !== id));
    void track(() => db.deleteApplicationRow(id));
  }, [track]);
  const setApplicationStatus = useCallback((id: string, s: ApplicationStatus) => {
    const app = applications.find((a) => a.id === id);
    setApplications((p) => p.map((a) => (a.id === id ? { ...a, status: s } : a)));
    void track(() => db.updateApplicationStatus(id, s));
    const job = app && jobs.find((j) => j.id === app.jobId);
    if (app && job) {
      if (s === "accepted") notify(app.workerId, "You were accepted for {job}. Report at {time}.", { job: job.title, time: job.reportTime ?? "08:00" }, "/worker/today");
      if (s === "rejected") notify(app.workerId, "Your application for {job} was not selected", { job: job.title }, "/worker/applications");
    }
  }, [applications, jobs, notify, track]);

  /* ----- attendance and pay ----- */

  const getMark = useCallback((job: Job, workerId: string, date: string) => attendance[db.attendanceKey(job.id, workerId, date)], [attendance]);
  const setMark: Store["setMark"] = useCallback((job, workerId, date, m) => {
    const key = db.attendanceKey(job.id, workerId, date);
    setAttendance((p) => { const n = { ...p }; if (m === "none") delete n[key]; else n[key] = m; return n; });
    void track(() => db.writeAttendance(job.id, workerId, date, m, uid.current!));
  }, [track]);

  const payroll = useMemo<PayrollRow[]>(() => {
    const rows: PayrollRow[] = [];
    for (const job of jobs) {
      if (job.startDate > TODAY) continue;
      for (const workerId of acceptedWorkers(job.id)) {
        const key = `${job.id}:${workerId}`;
        let days = 0;
        for (let i = 0; i < jobDays(job); i++) {
          const m = getMark(job, workerId, addDays(job.startDate, i));
          if (m === "P") days += 1;
          else if (m === "H") days += 0.5;
        }
        const rec = payments[key];
        const amount = rec ? rec.amount : earnedFor(job, days);
        if (!rec && amount === 0) continue;
        const overdue = job.endDate < TODAY;
        rows.push({
          key, job, workerId, days, amount,
          status: rec ? "paid" : overdue ? "overdue" : "pending",
          paidOn: rec?.paidOn, mode: rec?.mode, confirmed: rec?.confirmed,
        });
      }
    }
    return rows;
  }, [jobs, acceptedWorkers, getMark, payments]);

  const markPaid = useCallback((rows: PayrollRow[], mode: PayMode) => {
    setPayments((p) => {
      const next = { ...p };
      for (const r of rows) next[r.key] = { key: r.key, amount: r.amount, paidOn: TODAY, mode };
      return next;
    });
    void track(() => db.insertPayments(rows.map((r) => ({ jobId: r.job.id, workerId: r.workerId, amount: r.amount, mode }))));
    for (const r of rows) notify(r.workerId, "{amount} was paid for {job} via {mode}. Please confirm you received it.", { amount: `₹${r.amount.toLocaleString("en-IN")}`, job: r.job.title, mode }, "/worker/payouts");
  }, [notify, track]);

  const confirmPayment = useCallback((key: string) => {
    const rec = payments[key];
    const [jobId, workerId] = key.split(":");
    setPayments((p) => (p[key] ? { ...p, [key]: { ...p[key], confirmed: true } } : p));
    void track(() => db.confirmPaymentRow(jobId, workerId));
    const job = jobs.find((j) => j.id === jobId);
    if (rec && job) notify(job.contractorId, "{name} confirmed receiving {amount}", { name: workerName(workerId), amount: `₹${rec.amount.toLocaleString("en-IN")}` }, "/payments");
  }, [payments, jobs, notify, track]);

  const remindPayment = useCallback((key: string) => {
    const [jobId, workerId] = key.split(":");
    const job = jobs.find((j) => j.id === jobId);
    notify(job?.contractorId, "{name} is waiting for payment for {job}", { name: workerName(workerId), job: job?.title ?? "" }, "/payments");
  }, [jobs, notify]);
  const reportReview = useCallback(async (id: string) => { await db.reportReviewRow(id, uid.current!); }, []);

  /* ----- sites ----- */

  const addSite: Store["addSite"] = useCallback(async (s) => {
    const site = await db.insertSite(uid.current!, s);
    setSites((p) => [...p, site]);
    return site;
  }, []);
  const updateSite: Store["updateSite"] = useCallback(async (id, patch) => {
    const site = await db.patchSite(uid.current!, id, patch);
    setSites((p) => p.map((x) => (x.id === id ? site : x)));
  }, []);
  const removeSite = useCallback((id: string) => {
    setSites((p) => p.filter((x) => x.id !== id));
    void track(() => db.deleteSiteRow(id));
  }, [track]);

  /* ----- reviews ----- */

  const submitReview: Store["submitReview"] = useCallback(async (r) => {
    await db.insertReview(r, uid.current!, role.current!);
    const job = jobs.find((j) => j.id === r.jobId);
    const other = r.by === "contractor" ? r.workerId : job?.contractorId;
    const counterpart = reviews.some((x) => x.jobId === r.jobId && x.workerId === r.workerId && x.by !== r.by);
    const href = r.by === "contractor" ? "/worker/profile" : workerHref(r.workerId);
    const me = r.by === "contractor" ? contractor.company : workerName(uid.current!);
    notify(other, counterpart ? "Both reviews for {job} are now visible" : "{name} reviewed you for {job}. Submit yours to see it.", { name: me, job: r.jobTitle }, href);
    await refreshRef.current();
  }, [jobs, reviews, notify]);

  /* ----- live day-of workflow ----- */

  const shiftOf = useCallback((job: Job, workerId: string) => shifts[shiftId(job.id, workerId)] ?? blankShift(job, workerId), [shifts]);

  /** Change a shift: update the screen at once, then save the difference. */
  const mutate = useCallback((job: Job, workerId: string, fn: (s: Shift) => Shift) => {
    const id = shiftId(job.id, workerId);
    const prev = shiftsRef.current[id];
    const next = fn(prev ?? blankShift(job, workerId));
    shiftsRef.current = { ...shiftsRef.current, [id]: next };
    setShifts(shiftsRef.current);
    inQueue(() => db.saveShift(uid.current!, prev, next));
  }, [inQueue]);
  const ev = (s: Shift, type: Shift["events"][number]["type"], at: number, note?: string): Shift => ({ ...s, events: [...s.events, { type, at, note }] });
  const me = () => uid.current!;

  const worker: Store["worker"] = {
    startJourney: (job) => {
      const t = Date.now();
      mutate(job, me(), (s) => ev({ ...s, status: "on_the_way", journeyAt: t }, "journey_started", t));
      notify(job.contractorId, "{name} is on the way to {job}", { name: workerName(me()), job: job.title }, "/live");
    },
    atSite: (job) => {
      const t = Date.now();
      mutate(job, me(), (s) => ev({ ...s, status: "arrived", arrivedAt: t }, "arrived", t));
      notify(job.contractorId, "{name} is at the site for {job}", { name: workerName(me()), job: job.title }, "/live");
    },
    checkIn: (job) => {
      const t = Date.now();
      let late = 0;
      mutate(job, me(), (s) => { const n = { ...s, status: "working" as const, checkInAt: t }; late = lateMinutes(job, n); return ev({ ...n, lateMin: late }, "checked_in", t); });
      notify(job.contractorId, late ? "{name} checked in {n} min late at {job}" : "{name} checked in at {job}", { name: workerName(me()), job: job.title, n: late }, "/live");
    },
    startBreak: (job) => { const t = Date.now(); mutate(job, me(), (s) => ev({ ...s, status: "break", breaks: [...s.breaks, { start: t }] }, "break_started", t)); },
    endBreak: (job) => {
      const t = Date.now();
      mutate(job, me(), (s) => ev({ ...s, status: "working", breaks: s.breaks.map((b, i) => (i === s.breaks.length - 1 && b.end === undefined ? { ...b, end: t } : b)) }, "break_ended", t));
    },
    addProof: async (job, p) => {
      try {
        const src = await db.publicImage(p.src, me(), "proof");
        const t = Date.now();
        mutate(job, me(), (s) => ev({ ...s, proofs: [...s.proofs, { ...p, src, id: crypto.randomUUID(), at: t }].slice(-8) }, "proof_added", t));
        notify(job.contractorId, "{name} added a proof photo ({kind}) at {job}", { name: workerName(me()), kind: p.kind, job: job.title }, "/live");
      } catch (e) { fail(e); }
    },
    removeProof: (job, id) => mutate(job, me(), (s) => ({ ...s, proofs: s.proofs.filter((p) => p.id !== id) })),
    checkOut: (job, note) => {
      const t = Date.now();
      mutate(job, me(), (s) => ev({ ...s, status: "done", checkOutAt: t, workerNote: note || undefined, breaks: s.breaks.map((b) => (b.end === undefined ? { ...b, end: t } : b)) }, "checked_out", t));
      notify(job.contractorId, "{name} finished the day at {job}. Please review and approve.", { name: workerName(me()), job: job.title }, "/live");
    },
    resubmit: (job, reply) => {
      const t = Date.now();
      mutate(job, me(), (s) => ev({ ...s, status: "done", dispute: s.dispute ? { ...s.dispute, reply } : undefined }, "resubmitted", t, reply));
      notify(job.contractorId, "{name} replied about the shift at {job}", { name: workerName(me()), job: job.title }, "/live");
    },
  };

  const approveShift: Store["approveShift"] = useCallback((job, workerId, mark, note) => {
    const t = Date.now();
    mutate(job, workerId, (s) => ev({ ...s, status: "approved", decision: { mark, at: t, hours: Math.round((workedMs(s, t) / HOUR) * 10) / 10, note } }, "approved", t, note));
    setMark(job, workerId, TODAY, mark);
    notify(workerId, "Your day at {job} was approved as {mark}", { job: job.title, mark: mark === "P" ? "Present" : mark === "H" ? "Half day" : "Absent" }, "/worker/today");
  }, [mutate, setMark, notify]);

  const disputeShift: Store["disputeShift"] = useCallback((job, workerId, reason) => {
    const t = Date.now();
    mutate(job, workerId, (s) => ev({ ...s, status: "disputed", dispute: { reason, at: t } }, "disputed", t, reason));
    notify(workerId, "The contractor has a question about your shift at {job}", { job: job.title }, "/worker/today");
  }, [mutate, notify]);

  const value: Store = {
    jobs, applications, payments, lang, setLang, addJob, closeJob, setApplicationStatus,
    filled, statusOf, getMark, setMark, acceptedWorkers, payroll, markPaid,
    session, userId, account, logout, applyToJob, withdrawApplication,
    profile, profileReady, updateProfile, reviews, submitReview,
    contractorProfile, contractorProfiles, updateContractorProfile, sites, addSite, updateSite, removeSite,
    shifts, shiftOf, worker, approveShift, disputeShift,
    notifications, markNotificationsRead, confirmPayment, remindPayment, reportReview, notice, refresh,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useStore must be used inside StoreProvider");
  return c;
}

export { workerById };

import type { AppNotification, Application, AttendanceMark, ContractorProfile, Job, PaymentRecord, PayMode, Review, Shift, ShiftEvent, Site, Worker, WorkerProfile } from "@/data/types";
import { shiftId } from "./shifts";
import { createClient } from "./supabase/client";

/* Everything that talks to Supabase lives here, so the store and pages never build queries themselves. */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;
const sb = () => createClient();
const must = <T,>(res: { data: T; error: { message: string } | null }): T => {
  if (res.error) throw new Error(res.error.message);
  return res.data;
};

/** Extras (views added by migration_001) must not stop the app from loading if they are missing. */
const soft = (res: { data: unknown; error: { message: string } | null }): Row[] => {
  if (res.error) { console.warn("Kamgar: optional data unavailable:", res.error.message); return []; }
  return (res.data as Row[]) ?? [];
};

const ms = (iso: string | null | undefined) => (iso ? new Date(iso).getTime() : undefined);
const iso = (t: number | undefined) => (t === undefined ? null : new Date(t).toISOString());
const day = (d: string) => d.slice(0, 10);

/* ---------- files ---------- */

const PUBLIC = "public-media";

async function upload(bucket: string, dataUrl: string, uid: string, folder: string) {
  const blob = await (await fetch(dataUrl)).blob();
  const ext = blob.type === "image/png" ? "png" : blob.type === "image/webp" ? "webp" : "jpg";
  const path = `${uid}/${folder}/${crypto.randomUUID()}.${ext}`;
  must(await sb().storage.from(bucket).upload(path, blob, { contentType: blob.type, upsert: false }));
  return path;
}

/** Upload a picture the user just chose (a data URL) and return its public address. Already-uploaded addresses pass through. */
export async function publicImage(value: string | undefined, uid: string, folder: string): Promise<string | undefined> {
  if (!value || !value.startsWith("data:")) return value;
  const path = await upload(PUBLIC, value, uid, folder);
  return sb().storage.from(PUBLIC).getPublicUrl(path).data.publicUrl;
}

/* ---------- mapping rows to app types ---------- */

export const jobFromRow = (r: Row): Job => ({
  id: r.id, contractorId: r.contractor_id, title: r.title, skill: r.skill, area: r.area, address: r.address, needed: r.needed,
  payType: r.pay_type, amount: r.amount, startDate: day(r.start_date), endDate: day(r.end_date), postedOn: day(r.posted_on),
  closed: r.closed || undefined, reportTime: String(r.report_time).slice(0, 5), shiftHours: r.shift_hours, siteId: r.site_id ?? undefined,
});
export const siteFromRow = (r: Row): Site => ({
  id: r.id, contractorId: r.contractor_id, name: r.name, area: r.area, address: r.address, kind: r.kind, contactName: r.contact_name,
  contactPhone: r.contact_phone, amenities: r.amenities ?? [], photos: r.photos ?? [], createdOn: day(r.created_at),
});
export const appFromRow = (r: Row): Application => ({ id: r.id, jobId: r.job_id, workerId: r.worker_id, status: r.status, appliedOn: day(r.applied_on) });
export const paymentFromRow = (r: Row): PaymentRecord => ({
  key: `${r.job_id}:${r.worker_id}`, amount: r.amount, paidOn: day(r.paid_on), mode: r.mode as PayMode, confirmed: r.confirmed || undefined,
});
export const reviewFromRow = (r: Row): Review => ({
  id: r.id, jobId: r.job_id, jobTitle: r.job_title ?? "", jobArea: r.job_area ?? "", workerId: r.worker_id, by: r.author_role, fromName: r.from_name,
  rating: r.rating, criteria: r.criteria as [number, number, number], comment: r.comment, date: day(r.created_on), authorId: r.author_id, revealed: !!r.revealed,
});
export const notificationFromRow = (r: Row): AppNotification => ({
  id: r.id, at: new Date(r.created_at).getTime(), key: r.key, vars: r.vars ?? {}, href: r.href ?? undefined, read: r.read,
});

export function shiftFromRow(r: Row, events: Row[], breaks: Row[], proofs: Row[]): Shift {
  return {
    id: shiftId(r.job_id, r.worker_id, day(r.day)), jobId: r.job_id, workerId: r.worker_id, date: day(r.day), status: r.status,
    events: events.map((e): ShiftEvent => ({ type: e.type, at: new Date(e.at).getTime(), note: e.note ?? undefined })).sort((a, b) => a.at - b.at),
    journeyAt: ms(r.journey_at), journeyMs: r.journey_ms ?? undefined, distanceKm: r.distance_km === null ? undefined : Number(r.distance_km),
    arrivedAt: ms(r.arrived_at), checkInAt: ms(r.check_in_at), checkOutAt: ms(r.check_out_at),
    breaks: breaks.map((b) => ({ start: new Date(b.starts_at).getTime(), end: ms(b.ends_at) })).sort((a, b) => a.start - b.start),
    proofs: proofs.map((p) => ({ id: p.id, kind: p.kind, src: p.photo_path, caption: p.caption, at: new Date(p.at).getTime() })).sort((a, b) => a.at - b.at),
    workerNote: r.worker_note ?? undefined, lateMin: r.late_min ?? undefined,
    decision: r.decision_mark ? { mark: r.decision_mark, at: ms(r.decision_at) ?? 0, hours: Number(r.decision_hours ?? 0), note: r.decision_note ?? undefined } : undefined,
    dispute: r.dispute_reason ? { reason: r.dispute_reason, at: ms(r.dispute_at) ?? 0, reply: r.dispute_reply ?? undefined } : undefined,
  };
}

/* ---------- loading ---------- */

export interface Bundle {
  jobs: Job[]; applications: Application[]; sites: Site[]; payments: Record<string, PaymentRecord>;
  attendance: Record<string, AttendanceMark>; shifts: Record<string, Shift>; reviews: Review[]; notifications: AppNotification[];
  workers: Worker[]; contractors: { id: string; name: string; company: string; city: string; initials: string; phone: string }[];
  workerProfiles: Record<string, WorkerProfile>; contractorProfiles: Record<string, ContractorProfile>;
  ownWorker?: WorkerProfile; ownContractor?: ContractorProfile; fullName: string;
}

export const attendanceKey = (jobId: string, workerId: string, date: string) => `${jobId}:${workerId}:${date}`;
const shiftIds = new Map<string, string>();
const uniq = (a: (string | null | undefined)[]) => [...new Set(a.filter((x): x is string => !!x))];
const IN_LIMIT = 200;

export async function loadBundle(uid: string, role: "contractor" | "worker"): Promise<Bundle> {
  const c = sb();
  const [jobsR, appsR, sitesR, attR, shiftsR, payR, revR, notR, meR] = await Promise.all([
    role === "contractor" ? c.from("jobs").select("*").eq("contractor_id", uid).order("created_at", { ascending: false }) : c.from("jobs").select("*").order("created_at", { ascending: false }).limit(500),
    c.from("applications").select("*").order("applied_on", { ascending: false }),
    role === "contractor" ? c.from("sites").select("*").eq("contractor_id", uid) : c.from("sites").select("*").limit(500),
    c.from("attendance").select("*"),
    c.from("shifts").select("*, shift_events(*), shift_breaks(*), shift_proofs(*)"),
    c.from("payments").select("*"),
    c.from("reviews_visible").select("*").order("created_on", { ascending: false }),
    c.from("notifications").select("*").order("created_at", { ascending: false }).limit(80),
    c.from("profiles").select("full_name").eq("id", uid).single(),
  ]);
  const jobRows = must(jobsR) as Row[], appRows = must(appsR) as Row[], shiftRows = must(shiftsR) as Row[];
  const jobs = jobRows.map(jobFromRow);
  const applications = appRows.map(appFromRow);

  const attendance: Bundle["attendance"] = {};
  for (const r of must(attR) as Row[]) attendance[attendanceKey(r.job_id, r.worker_id, day(r.day))] = r.mark;
  const shifts: Bundle["shifts"] = {};
  for (const r of shiftRows) {
    shiftIds.set(shiftId(r.job_id, r.worker_id, day(r.day)), r.id);
    const s = shiftFromRow(r, r.shift_events ?? [], r.shift_breaks ?? [], r.shift_proofs ?? []);
    shifts[s.id] = s;
  }
  const payments: Bundle["payments"] = {};
  for (const r of must(payR) as Row[]) { const p = paymentFromRow(r); payments[p.key] = p; }

  const workerIds = uniq([...applications.map((a) => a.workerId), ...shiftRows.map((r) => r.worker_id), ...Object.values(payments).map((p) => p.key.split(":")[1]), ...(role === "worker" ? [uid] : [])]);
  const contractorIds = uniq([...jobs.map((j) => j.contractorId), ...(role === "contractor" ? [uid] : [])]);
  const slice = (ids: string[]) => ids.slice(0, IN_LIMIT);

  const [profR, wpR, wprR, wsR, worksR, refsR, cpR, cprR, ratingsR] = await Promise.all([
    c.from("profiles").select("id, role, full_name").in("id", slice(uniq([...workerIds, ...contractorIds]))),
    c.from("worker_profiles").select("*").in("user_id", slice(workerIds)),
    c.from("worker_private").select("*").in("user_id", slice(workerIds)),
    c.from("worker_stats").select("*").in("worker_id", slice(workerIds)),
    c.from("worker_works").select("*").in("worker_id", slice(workerIds)),
    c.from("worker_references").select("*").in("worker_id", slice(workerIds)),
    c.from("contractor_profiles").select("*").in("user_id", slice(contractorIds)),
    c.from("contractor_private").select("*").in("user_id", slice(contractorIds)),
    c.from("worker_ratings").select("*").in("worker_id", slice(workerIds)),
  ]);
  const names: Record<string, string> = {};
  for (const r of must(profR) as Row[]) names[r.id] = r.full_name;
  const by = <T extends Row>(rows: T[], key: string) => Object.fromEntries(rows.map((r) => [r[key], r]));
  const wp = by(must(wpR) as Row[], "user_id"), wpr = by(must(wprR) as Row[], "user_id"), ws = by(soft(wsR), "worker_id");
  const rating = by(soft(ratingsR), "worker_id");
  const cp = by(must(cpR) as Row[], "user_id"), cpr = by(must(cprR) as Row[], "user_id");
  const works: Record<string, Row[]> = {}, refs: Record<string, Row[]> = {};
  for (const r of must(worksR) as Row[]) (works[r.worker_id] ??= []).push(r);
  for (const r of must(refsR) as Row[]) (refs[r.worker_id] ??= []).push(r);

  const workerProfile = (id: string, own: boolean): WorkerProfile => {
    const p = wp[id] ?? {}, q = wpr[id] ?? {};
    return {
      onboarded: !!p.onboarded, phoneVerified: !!p.phone_verified, name: names[id] ?? "", phone: q.phone ?? "", birthYear: q.birth_year ?? null,
      area: p.area ?? "", nativePlace: p.native_place ?? "", skill: p.skill ?? "", otherSkills: p.other_skills ?? [], experience: p.experience ?? 0,
      languages: p.languages ?? [], rate: p.rate ?? 0, availability: p.availability ?? "now", about: p.about ?? "", photo: p.photo_path ?? undefined,
      emergencyName: q.emergency_name ?? "", emergencyPhone: q.emergency_phone ?? "", upi: q.upi ?? "",
      docs: {},
      works: (works[id] ?? []).map((w) => ({ id: w.id, title: w.title, skill: w.skill, area: w.area, year: w.year, description: w.description, images: w.images ?? [], refName: w.ref_name ?? undefined, refPhone: w.ref_phone ?? undefined })),
      references: (refs[id] ?? []).map((r) => ({ id: r.id, name: r.name, relation: r.relation, phone: r.phone })),
    };
  };
  const contractorProfile = (id: string, own: boolean): ContractorProfile => {
    const p = cp[id] ?? {}, q = cpr[id] ?? {};
    return {
      onboarded: !!p.onboarded, phoneVerified: !!p.phone_verified, ownerName: names[id] ?? "", phone: q.phone ?? "", company: p.company ?? "", kind: p.kind ?? "firm",
      yearsInBusiness: p.years_in_business ?? 0, teamSize: p.team_size ?? "6-20", city: p.city ?? "", areas: p.areas ?? [], trades: p.trades ?? [], about: p.about ?? "",
      logo: p.logo_path ?? undefined, officeAddress: q.office_address ?? "", gst: q.gst ?? "", upi: q.upi ?? "", pledge: !!p.pledge,
      docs: {},
    };
  };

  const workerProfiles = Object.fromEntries(workerIds.map((id) => [id, workerProfile(id, id === uid)]));
  const contractorProfiles = Object.fromEntries(contractorIds.map((id) => [id, contractorProfile(id, id === uid)]));
  const workers: Worker[] = workerIds.map((id) => {
    const p = workerProfiles[id];
    return { id, name: p.name || "Worker", skill: p.skill, experience: p.experience, rating: Number(rating[id]?.avg_rating ?? 0), phone: p.phone, area: p.area, languages: p.languages, completedJobs: ws[id]?.completed_jobs ?? 0 };
  });
  const contractors = contractorIds.map((id) => {
    const p = contractorProfiles[id];
    const name = p.ownerName || "Contractor";
    return { id, name, company: p.company || name, city: p.city, initials: name.split(" ").map((x) => x[0]).slice(0, 2).join("").toUpperCase(), phone: p.phone };
  });

  return {
    jobs, applications, sites: (must(sitesR) as Row[]).map(siteFromRow), payments, attendance, shifts,
    reviews: soft(revR).map(reviewFromRow), notifications: (must(notR) as Row[]).map(notificationFromRow),
    workers, contractors, workerProfiles, contractorProfiles, fullName: (must(meR) as Row).full_name ?? "",
    ownWorker: role === "worker" ? workerProfiles[uid] : undefined, ownContractor: role === "contractor" ? contractorProfiles[uid] : undefined,
  };
}

/* ---------- writing ---------- */

export async function insertJob(j: Omit<Job, "id" | "postedOn">): Promise<Job> {
  return jobFromRow(must(await sb().from("jobs").insert({
    contractor_id: j.contractorId, site_id: j.siteId ?? null, title: j.title, skill: j.skill, area: j.area, address: j.address, needed: j.needed,
    pay_type: j.payType, amount: j.amount, start_date: j.startDate, end_date: j.endDate, report_time: j.reportTime ?? "08:00", shift_hours: j.shiftHours ?? 8,
  }).select().single()) as Row);
}
export const closeJobRow = async (id: string) => { must(await sb().from("jobs").update({ closed: true }).eq("id", id)); };

export async function insertApplication(jobId: string, workerId: string): Promise<Application> {
  return appFromRow(must(await sb().from("applications").insert({ job_id: jobId, worker_id: workerId }).select().single()) as Row);
}
export const deleteApplicationRow = async (id: string) => { must(await sb().from("applications").delete().eq("id", id)); };
export const updateApplicationStatus = async (id: string, status: string) => { must(await sb().from("applications").update({ status }).eq("id", id)); };

export async function writeAttendance(jobId: string, workerId: string, date: string, mark: AttendanceMark | "none", by: string) {
  const q = sb().from("attendance");
  if (mark === "none") { must(await q.delete().eq("job_id", jobId).eq("worker_id", workerId).eq("day", date)); return; }
  must(await q.upsert({ job_id: jobId, worker_id: workerId, day: date, mark, marked_by: by }, { onConflict: "job_id,worker_id,day" }));
}

export async function insertPayments(rows: { jobId: string; workerId: string; amount: number; mode: PayMode }[]) {
  must(await sb().from("payments").insert(rows.map((r) => ({ job_id: r.jobId, worker_id: r.workerId, amount: r.amount, mode: r.mode }))));
}
export const confirmPaymentRow = async (jobId: string, workerId: string) => {
  must(await sb().from("payments").update({ confirmed: true }).eq("job_id", jobId).eq("worker_id", workerId));
};

export async function insertReview(r: { jobId: string; workerId: string; rating: number; criteria: [number, number, number]; comment: string }, uid: string, role: "contractor" | "worker") {
  // The database fills in the author, side and display name from the signed-in account.
  must(await sb().from("reviews").insert({ job_id: r.jobId, worker_id: r.workerId, rating: r.rating, criteria: r.criteria, comment: r.comment, author_role: role, author_id: uid }));
}

export async function insertNotification(userId: string, key: string, vars: AppNotification["vars"], href?: string) {
  await sb().from("notifications").insert({ user_id: userId, key, vars, href: href ?? null });   // best effort
}
export const markAllRead = async (uid: string) => { await sb().from("notifications").update({ read: true }).eq("user_id", uid).eq("read", false); };

export async function reportReviewRow(reviewId: string, uid: string) {
  must(await sb().from("review_reports").insert({ review_id: reviewId, reporter_id: uid }));
}

/* sites */
const siteCols = (s: Partial<Site>) => ({
  ...(s.name !== undefined && { name: s.name }), ...(s.area !== undefined && { area: s.area }), ...(s.address !== undefined && { address: s.address }),
  ...(s.kind !== undefined && { kind: s.kind }), ...(s.contactName !== undefined && { contact_name: s.contactName }),
  ...(s.contactPhone !== undefined && { contact_phone: s.contactPhone }), ...(s.amenities !== undefined && { amenities: s.amenities }),
  ...(s.photos !== undefined && { photos: s.photos }),
});
export async function insertSite(uid: string, s: Omit<Site, "id" | "createdOn" | "contractorId">): Promise<Site> {
  const photos = (await Promise.all(s.photos.map((p) => publicImage(p, uid, "sites")))) as string[];
  return siteFromRow(must(await sb().from("sites").insert({ contractor_id: uid, ...siteCols({ ...s, photos }) }).select().single()) as Row);
}
export async function patchSite(uid: string, id: string, patch: Partial<Site>): Promise<Site> {
  const photos = patch.photos ? ((await Promise.all(patch.photos.map((p) => publicImage(p, uid, "sites")))) as string[]) : undefined;
  return siteFromRow(must(await sb().from("sites").update(siteCols({ ...patch, photos })).eq("id", id).select().single()) as Row);
}
export const deleteSiteRow = async (id: string) => { must(await sb().from("sites").delete().eq("id", id)); };

/* shifts */

/** Save the change between two versions of a shift. The worker and the contractor each write only the columns they own. */
export async function saveShift(uid: string, prev: Shift | undefined, next: Shift) {
  const c = sb();
  let dbId = shiftIds.get(next.id);
  if (!dbId) {
    const ins = await c.from("shifts").insert({ job_id: next.jobId, worker_id: next.workerId, day: next.date }).select("id").single();
    if (ins.error) dbId = (must(await c.from("shifts").select("id").eq("job_id", next.jobId).eq("worker_id", next.workerId).eq("day", next.date).single()) as Row).id;
    else dbId = (ins.data as Row).id;
    shiftIds.set(next.id, dbId!);
  }
  const asWorker = uid === next.workerId;
  const cols: Row = asWorker
    ? {
        status: next.status, journey_at: iso(next.journeyAt), journey_ms: next.journeyMs ?? null, distance_km: next.distanceKm ?? null,
        arrived_at: iso(next.arrivedAt), check_in_at: iso(next.checkInAt), check_out_at: iso(next.checkOutAt), late_min: next.lateMin ?? null,
        worker_note: next.workerNote ?? null, dispute_reply: next.dispute?.reply ?? null,
      }
    : {
        status: next.status,
        decision_mark: next.decision?.mark ?? null, decision_at: iso(next.decision?.at), decision_hours: next.decision?.hours ?? null, decision_note: next.decision?.note ?? null,
        dispute_reason: next.dispute?.reason ?? null, dispute_at: iso(next.dispute?.at),
      };
  must(await c.from("shifts").update(cols).eq("id", dbId));

  const fresh = next.events.slice(prev?.events.length ?? 0);
  if (fresh.length) must(await c.from("shift_events").insert(fresh.map((e) => ({ shift_id: dbId, type: e.type, at: iso(e.at), note: e.note ?? null }))));
  if (asWorker) {
    if (JSON.stringify(prev?.breaks ?? []) !== JSON.stringify(next.breaks)) {
      must(await c.from("shift_breaks").delete().eq("shift_id", dbId));
      if (next.breaks.length) must(await c.from("shift_breaks").insert(next.breaks.map((b) => ({ shift_id: dbId, starts_at: iso(b.start), ends_at: iso(b.end) }))));
    }
    const had = new Set((prev?.proofs ?? []).map((p) => p.id)), has = new Set(next.proofs.map((p) => p.id));
    const added = next.proofs.filter((p) => !had.has(p.id));
    if (added.length) must(await c.from("shift_proofs").insert(added.map((p) => ({ id: p.id, shift_id: dbId, kind: p.kind, photo_path: p.src ?? "", caption: p.caption, at: iso(p.at) }))));
    const gone = (prev?.proofs ?? []).filter((p) => !has.has(p.id)).map((p) => p.id);
    if (gone.length) must(await c.from("shift_proofs").delete().in("id", gone));
  }
}

/* profiles */

const diffIds = (before: { id: string }[], after: { id: string }[]) => {
  const keep = new Set(after.map((x) => x.id));
  return before.filter((x) => !keep.has(x.id)).map((x) => x.id);
};

/** Save a worker's profile. Returns the profile with uploaded pictures swapped for their addresses. */
export async function saveWorkerProfile(uid: string, prev: WorkerProfile, next: WorkerProfile): Promise<WorkerProfile> {
  const c = sb();
  const photo = await publicImage(next.photo, uid, "profile");
  const works = await Promise.all(next.works.map(async (w) => ({ ...w, images: (await Promise.all(w.images.map((i) => publicImage(i, uid, "work")))) as string[] })));
  must(await c.from("profiles").update({ full_name: next.name }).eq("id", uid));
  must(await c.from("worker_profiles").update({
    onboarded: next.onboarded, phone_verified: next.phoneVerified, area: next.area, native_place: next.nativePlace, skill: next.skill, other_skills: next.otherSkills,
    experience: next.experience, languages: next.languages, rate: next.rate, availability: next.availability, about: next.about, photo_path: photo ?? null,
  }).eq("user_id", uid));
  must(await c.from("worker_private").update({
    phone: next.phone, birth_year: next.birthYear, emergency_name: next.emergencyName, emergency_phone: next.emergencyPhone, upi: next.upi,
  }).eq("user_id", uid));
  const goneWorks = diffIds(prev.works, works);
  if (goneWorks.length) must(await c.from("worker_works").delete().in("id", goneWorks));
  if (works.length) must(await c.from("worker_works").upsert(works.map((w) => ({ id: w.id, worker_id: uid, title: w.title, skill: w.skill, area: w.area, year: w.year, description: w.description, images: w.images, ref_name: w.refName ?? null, ref_phone: w.refPhone ?? null }))));
  const goneRefs = diffIds(prev.references, next.references);
  if (goneRefs.length) must(await c.from("worker_references").delete().in("id", goneRefs));
  if (next.references.length) must(await c.from("worker_references").upsert(next.references.map((r) => ({ id: r.id, worker_id: uid, name: r.name, relation: r.relation, phone: r.phone }))));
  return { ...next, photo, works };
}

export async function saveContractorProfile(uid: string, prev: ContractorProfile, next: ContractorProfile): Promise<ContractorProfile> {
  const c = sb();
  const logo = await publicImage(next.logo, uid, "logo");
  must(await c.from("profiles").update({ full_name: next.ownerName }).eq("id", uid));
  must(await c.from("contractor_profiles").update({
    onboarded: next.onboarded, phone_verified: next.phoneVerified, company: next.company, kind: next.kind, years_in_business: next.yearsInBusiness, team_size: next.teamSize,
    city: next.city, areas: next.areas, trades: next.trades, about: next.about, logo_path: logo ?? null, pledge: next.pledge,
  }).eq("user_id", uid));
  must(await c.from("contractor_private").update({ phone: next.phone, office_address: next.officeAddress, gst: next.gst, upi: next.upi }).eq("user_id", uid));
  return { ...next, logo };
}

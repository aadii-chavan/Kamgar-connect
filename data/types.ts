export type PayType = "daily" | "hourly" | "fixed";
export type ApplicationStatus = "pending" | "accepted" | "rejected";
export type AttendanceMark = "P" | "H" | "A";
export type PayMode = "Cash" | "UPI" | "Bank";
export type JobStatus = "open" | "filled" | "closed";

export interface Contractor {
  name: string;
  company: string;
  city: string;
  initials: string;
  phone?: string;
}

export interface Job {
  id: string;
  /** The contractor (account id) who posted it. */
  contractorId: string;
  title: string;
  skill: string;
  area: string;
  address: string;
  needed: number;
  payType: PayType;
  amount: number;
  startDate: string; // ISO yyyy-mm-dd
  endDate: string;
  postedOn: string;
  closed?: boolean;
  /** Reporting time on site, "HH:MM" (default 08:00). */
  reportTime?: string;
  /** Expected working hours per day (default 8). */
  shiftHours?: number;
  /** The work site this job is at. */
  siteId?: string;
}

export interface Worker {
  id: string;
  name: string;
  skill: string;
  experience: number;
  rating: number;
  phone: string;
  area: string;
  languages: string[];
  completedJobs: number;
}

export interface Application {
  id: string;
  jobId: string;
  workerId: string;
  status: ApplicationStatus;
  appliedOn: string;
}

export interface PaymentRecord {
  key: string; // `${jobId}:${workerId}`
  /** A negative amount means "the amount earned at the time", used by seed data. */
  amount: number;
  paidOn: string;
  mode: PayMode;
  /** The worker confirmed they received this payment. */
  confirmed?: boolean;
}

/* ---------- Worker profile & trust ---------- */
export type DocKind = "idProof" | "skillCert" | "police";
export type Availability = "now" | "week" | "later";

export interface DocState {
  /** Starts as "review"; an administrator marks it "verified". */
  status: "review" | "verified";
  fileName: string;
  preview?: string; // small image data URL when the file is an image
  number?: string; // ID number, stored masked for display
  uploadedAt: number;
}

export interface WorkItem {
  id: string;
  title: string;
  skill: string;
  area: string;
  year: number;
  description: string;
  images: string[]; // compressed data URLs
  refName?: string;
  refPhone?: string;
}

export interface Reference { id: string; name: string; relation: string; phone: string }

export interface WorkerProfile {
  onboarded: boolean;
  phoneVerified: boolean;
  name: string;
  phone: string;
  birthYear: number | null;
  area: string;
  nativePlace: string;
  skill: string;
  otherSkills: string[];
  experience: number;
  languages: string[];
  rate: number;
  availability: Availability;
  about: string;
  photo?: string;
  emergencyName: string;
  emergencyPhone: string;
  upi: string;
  docs: Partial<Record<DocKind, DocState>>;
  works: WorkItem[];
  references: Reference[];
}

/* ---------- Reviews (two-sided) ---------- */
export type ReviewBy = "contractor" | "worker";

export interface Review {
  id: string;
  jobId: string;
  jobTitle: string;
  jobArea: string;
  workerId: string;
  by: ReviewBy;
  fromName: string;
  rating: number; // 1–5
  criteria: [number, number, number];
  comment: string;
  date: string; // ISO
  /** Who wrote it (account id). */
  authorId: string;
  /** The server says this review may be shown to the other side. */
  revealed: boolean;
}

/* ---------- Live shifts (the day-of workflow) ---------- */
export type ShiftStatus = "scheduled" | "on_the_way" | "arrived" | "working" | "break" | "done" | "approved" | "disputed";
export type ShiftEventType =
  | "journey_started" | "arrived" | "checked_in" | "break_started" | "break_ended"
  | "proof_added" | "checked_out" | "approved" | "disputed" | "resubmitted";

export interface ShiftEvent { type: ShiftEventType; at: number; note?: string }

export interface ProofPhoto {
  id: string;
  kind: "before" | "during" | "after";
  /** Uploaded photo (compressed data URL). */
  src?: string;
  caption: string;
  at: number;
}

export interface Shift {
  id: string; // `${jobId}:${workerId}:${date}`
  jobId: string;
  workerId: string;
  date: string;
  status: ShiftStatus;
  events: ShiftEvent[];
  journeyAt?: number;
  journeyMs?: number;
  distanceKm?: number;
  arrivedAt?: number;
  checkInAt?: number;
  checkOutAt?: number;
  breaks: { start: number; end?: number }[];
  proofs: ProofPhoto[];
  workerNote?: string;
  lateMin?: number;
  decision?: { mark: AttendanceMark; at: number; hours: number; note?: string };
  dispute?: { reason: string; at: number; reply?: string };
}

export interface AppNotification {
  id: string;
  at: number; // epoch ms
  key: string; // English message with {placeholders}
  vars: Record<string, string | number>;
  href?: string;
  read?: boolean;
}

/* ---------- Contractor profile, sites ---------- */
export type Amenity = "water" | "toilet" | "firstAid" | "helmets" | "meals" | "shade" | "transport";
export type SiteKind = "residential" | "commercial" | "industrial" | "other";

export interface Site {
  id: string;
  contractorId: string;
  name: string;
  area: string;
  address: string;
  kind: SiteKind;
  contactName: string;
  contactPhone: string;
  amenities: Amenity[];
  photos: string[]; // compressed data URLs
  createdOn: string;
}

export type BusinessKind = "individual" | "firm" | "company";
export type ContractorDocKind = "ownerId" | "business";

export interface ContractorProfile {
  onboarded: boolean;
  phoneVerified: boolean;
  ownerName: string;
  phone: string;
  company: string;
  kind: BusinessKind;
  yearsInBusiness: number;
  teamSize: string;
  city: string;
  areas: string[];
  trades: string[];
  about: string;
  logo?: string;
  officeAddress: string;
  gst: string;
  upi: string;
  /** Agreed to pay fairly and on time, and to provide a safe site. */
  pledge: boolean;
  docs: Partial<Record<ContractorDocKind, DocState>>;
}

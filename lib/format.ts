import type { Job } from "@/data/types";

/** yyyy-mm-dd for a date, in the viewer's local time zone. */
export const isoDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
/** Today's date. Fixed when the page loads. */
export const TODAY = isoDate(new Date());

export type Lang = "en" | "hi" | "mr";
let LANG: Lang = "en";
/** Set once per render by the store so the pure formatters below follow the selected language. */
export const setFormatLang = (l: Lang) => { LANG = l; };

const MONTHS: Record<Lang, string[]> = {
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  hi: ["जन", "फ़र", "मार्च", "अप्रैल", "मई", "जून", "जुल", "अग", "सित", "अक्टू", "नव", "दिस"],
  mr: ["जाने", "फेब्रु", "मार्च", "एप्रि", "मे", "जून", "जुलै", "ऑग", "सप्टें", "ऑक्टो", "नोव्हें", "डिसें"],
};
const WEEKDAYS: Record<Lang, string[]> = {
  en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  hi: ["रवि", "सोम", "मंगल", "बुध", "गुरु", "शुक्र", "शनि"],
  mr: ["रवि", "सोम", "मंगळ", "बुध", "गुरु", "शुक्र", "शनि"],
};
/** Weekday short names starting Monday, for calendar headers. */
export const weekdaysMonFirst = () => [1, 2, 3, 4, 5, 6, 0].map((i) => WEEKDAYS[LANG][i]);
const MONTH_FULL: Record<Lang, string[]> = {
  en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
  hi: ["जनवरी", "फ़रवरी", "मार्च", "अप्रैल", "मई", "जून", "जुलाई", "अगस्त", "सितंबर", "अक्टूबर", "नवंबर", "दिसंबर"],
  mr: ["जानेवारी", "फेब्रुवारी", "मार्च", "एप्रिल", "मे", "जून", "जुलै", "ऑगस्ट", "सप्टेंबर", "ऑक्टोबर", "नोव्हेंबर", "डिसेंबर"],
};
/** "October 2026" */
export function formatMonth(month: string) {
  const [y, m] = month.split("-").map(Number);
  return `${MONTH_FULL[LANG][m - 1]} ${y}`;
}

export function toUTC(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}
export const fromUTC = (ms: number) => new Date(ms).toISOString().slice(0, 10);
export const addDays = (iso: string, n: number) => fromUTC(toUTC(iso) + n * 86400000);
export const daysInclusive = (a: string, b: string) =>
  b < a ? 0 : Math.round((toUTC(b) - toUTC(a)) / 86400000) + 1;

/** "12 Oct 2026" */
export function formatDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[LANG][m - 1]} ${y}`;
}
/** "12 Oct" */
export function formatShort(iso: string) {
  const [, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[LANG][m - 1]}`;
}
export const weekday = (iso: string) => WEEKDAYS[LANG][new Date(toUTC(iso)).getUTCDay()];

/** "₹1,20,000" (Indian digit grouping) */
export const formatINR = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

export function rateLabel(job: Pick<Job, "payType" | "amount">) {
  const amt = formatINR(job.amount);
  const unit = {
    daily: { en: "/day", hi: "/दिन", mr: "/दिवस" },
    hourly: { en: "/hr", hi: "/घंटा", mr: "/तास" },
    fixed: { en: " fixed", hi: " तय", mr: " ठरलेले" },
  }[job.payType][LANG];
  return `${amt}${unit}`;
}

export const initials = (name: string) =>
  name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

export const yrs = (n: number) => (LANG === "en" ? `${n} ${n === 1 ? "yr" : "yrs"}` : `${n} वर्ष`);

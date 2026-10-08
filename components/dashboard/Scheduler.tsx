"use client";
import Link from "next/link";
import { jobHref } from "@/lib/links";
import type { Job } from "@/data/types";
import { TODAY, addDays, formatShort, toUTC, weekdaysMonFirst } from "@/lib/format";
import { useT } from "@/lib/i18n";
import { cn } from "../ui/cn";

/** Month grid (Monday first) with dots on days where a job starts (green) or ends (red). */
export function Scheduler({ jobs, month = TODAY.slice(0, 7) }: { jobs: Job[]; month?: string }) {
  const t = useT();
  const first = `${month}-01`;
  const offset = (new Date(toUTC(first)).getUTCDay() + 6) % 7;
  const [y, m] = month.split("-").map(Number);
  const daysIn = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const cells = Math.ceil((offset + daysIn) / 7) * 7;
  const days = Array.from({ length: cells }, (_, i) => addDays(first, i - offset));

  const events = (iso: string) => ({
    start: jobs.filter((j) => !j.closed && j.startDate === iso),
    end: jobs.filter((j) => !j.closed && j.endDate === iso),
  });

  return (
    <div className="px-5 pb-7 sm:px-7">
      <div className="grid grid-cols-7 text-center text-xs text-ink-mute">
        {weekdaysMonFirst().map((d) => <div key={d} className="py-2">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-y-1 text-center text-sm">
        {days.map((iso) => {
          const inMonth = iso.startsWith(month);
          const ev = events(iso);
          const isToday = iso === TODAY;
          const label = [
            formatShort(iso), isToday && t("today"),
            ...ev.start.map((j) => t("{job} starts", { job: t(j.title) })), ...ev.end.map((j) => t("{job} ends", { job: t(j.title) })),
          ].filter(Boolean).join(", ");
          const hasEv = ev.start.length + ev.end.length > 0;
          const cls = cn("relative mx-auto flex h-11 w-11 flex-col items-center justify-center rounded-full tabular-nums", inMonth ? "text-ink" : "text-ink-mute/50", isToday && "bg-ink font-medium text-white", hasEv && !isToday && "hover:bg-canvas");
          const inner = (
            <>
              {Number(iso.slice(8))}
              {hasEv && (
                <span className="absolute bottom-1.5 flex gap-0.5" aria-hidden>
                  {ev.start.length > 0 && <span className="h-1.5 w-1.5 rounded-full bg-[#1C9A63]" />}
                  {ev.end.length > 0 && <span className="h-1.5 w-1.5 rounded-full bg-[#EF5A66]" />}
                </span>
              )}
            </>
          );
          return hasEv ? (
            <Link key={iso} aria-label={label} href={jobHref((ev.start[0] ?? ev.end[0]).id)} className={cls}>{inner}</Link>
          ) : (
            <div key={iso} aria-label={label} className={cls}>{inner}</div>
          );
        })}
      </div>
      <div className="mt-3 flex gap-5 text-xs text-ink-mute">
        <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#1C9A63]" />{t("Job starts")}</span>
        <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#EF5A66]" />{t("Job ends")}</span>
      </div>
    </div>
  );
}

"use client";
import { CalendarDays, MapPin } from "lucide-react";
import { jobHref } from "@/lib/links";
import Link from "next/link";
import type { Job } from "@/data/types";
import { formatShort, rateLabel } from "@/lib/format";
import { useT } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import { JobStatusChip } from "../ui/Chip";
import { ProgressBar } from "../ui/ProgressBar";
import { SkillIcon } from "../ui/SkillIcon";

export function JobCard({ job }: { job: Job }) {
  const { statusOf, filled, applications } = useStore();
  const t = useT();
  const f = filled(job.id);
  const pending = applications.filter((a) => a.jobId === job.id && a.status === "pending").length;
  return (
    <Link
      href={jobHref(job.id)}
      className="group flex flex-col rounded-3xl bg-white p-6 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-lift"
    >
      <div className="flex items-start justify-between gap-3">
        <SkillIcon skill={job.skill} size={52} />
        <JobStatusChip status={statusOf(job)} />
      </div>
      <h3 className="mt-4 text-xl font-normal leading-snug text-ink">{t(job.title)}</h3>
      <div className="mt-1 flex items-center gap-1.5 text-[13px] text-ink-mute">
        <MapPin size={13} />{t(job.area)} · {t(job.skill)} · {job.id}
      </div>

      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between text-xs font-medium">
          <span className="text-ink-soft">{t("Workers filled")}</span>
          <span className="tabular-nums text-ink">{f}/{job.needed}</span>
        </div>
        <ProgressBar value={f} max={job.needed} />
      </div>

      <div className="mt-5 flex items-end justify-between border-t border-line pt-4">
        <div>
          <div className="text-xl font-medium tabular-nums">{rateLabel(job)}</div>
          <div className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-mute tabular-nums">
            <CalendarDays size={12} />{formatShort(job.startDate)} – {formatShort(job.endDate)}
          </div>
        </div>
        {pending > 0 && (
          <span className="rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent">{t("{n} new", { n: pending })}</span>
        )}
      </div>
    </Link>
  );
}

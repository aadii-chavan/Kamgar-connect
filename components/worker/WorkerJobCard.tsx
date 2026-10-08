"use client";
import { CalendarDays, MapPin } from "lucide-react";
import { contractorOf, currentWorkerId } from "@/data/jobs";
import { useContractorRating, useContractorTrust } from "@/lib/ratings";
import Link from "next/link";
import { AmenityChips } from "../site/AmenityChips";
import { ShieldCheck, Star } from "lucide-react";
import type { Job } from "@/data/types";
import { workerById } from "@/data/workers";
import { formatShort, rateLabel } from "@/lib/format";
import { tn, useT } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import { useApply } from "@/lib/worker";
import { Button } from "../ui/Button";
import { ApplicationChip, Chip } from "../ui/Chip";
import { ProgressBar } from "../ui/ProgressBar";
import { SkillIcon } from "../ui/SkillIcon";

export function WorkerJobCard({ job }: { job: Job }) {
  const t = useT();
  const { applications, filled, statusOf } = useStore();
  const { apply, withdraw } = useApply();
  const me = workerById(currentWorkerId);
  const contractor = contractorOf(job.contractorId);
  const cr = useContractorRating(job.contractorId);
  const ct = useContractorTrust(job.contractorId);
  const site = ct.sites.find((x) => x.id === job.siteId);
  const mine = applications.find((a) => a.jobId === job.id && a.workerId === me.id);
  const f = filled(job.id);
  const left = Math.max(job.needed - f, 0);
  const match = job.skill === me.skill;

  return (
    <article className="flex flex-col rounded-3xl bg-white p-6 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <SkillIcon skill={job.skill} size={52} />
        {match && <Chip tone="green">{t("Skill match")}</Chip>}
      </div>
      <h3 className="mt-4 text-xl font-normal leading-snug text-ink">{t(job.title)}</h3>
      <div className="mt-1 flex items-center gap-1.5 text-[13px] text-ink-mute">
        <MapPin size={13} />{t(job.area)} · {t(job.skill)} · {t(contractor.company)}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-soft">
        {ct.p.pledge && <span className="inline-flex items-center gap-1 text-ok-fg"><ShieldCheck size={13} />{t("Fair-pay pledge")}</span>}
        {cr.stats.count > 0 && <span className="inline-flex items-center gap-1 tabular-nums"><Star size={12} className="fill-[#F2A93B] text-[#F2A93B]" />{cr.rating.toFixed(1)}<span className="text-ink-mute">({cr.stats.count})</span></span>}
        <Link href={`/worker/contractor?id=${job.contractorId}`} className="underline underline-offset-4 hover:text-ink">{t("View contractor")}</Link>
      </div>
      {site && <AmenityChips amenities={site.amenities} compact max={6} className="mt-3" />}

      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between text-xs">
          <span className="text-ink-soft">{left === 0 ? t("No spots left") : tn(t, left, "{n} spot left", "{n} spots left")}</span>
          <span className="tabular-nums text-ink">{f}/{job.needed}</span>
        </div>
        <ProgressBar value={f} max={job.needed} />
      </div>

      <div className="mt-5 flex items-end justify-between gap-3 border-t border-line pt-4">
        <div>
          <div className="text-xl font-medium tabular-nums">{rateLabel(job)}</div>
          <div className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-mute tabular-nums">
            <CalendarDays size={12} />{formatShort(job.startDate)} – {formatShort(job.endDate)}
          </div>
        </div>
        {mine ? (
          mine.status === "pending" ? (
            <div className="flex items-center gap-2">
              <ApplicationChip status="pending" />
              <Button size="sm" variant="ghost" onClick={() => withdraw(mine)}>{t("Withdraw")}</Button>
            </div>
          ) : <ApplicationChip status={mine.status} />
        ) : statusOf(job) === "filled" ? (
          <Chip tone="slate">{t("Filled")}</Chip>
        ) : (
          <Button size="sm" variant="primary" onClick={() => apply(job)}>{t("Apply")}</Button>
        )}
      </div>
    </article>
  );
}

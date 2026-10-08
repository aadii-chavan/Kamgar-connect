"use client";
import { Check, Lock, Star } from "lucide-react";
import { useState } from "react";
import { contractorOf, currentWorkerId } from "@/data/jobs";
import { RatingSummary, Stars } from "../reviews/Stars";
import { ReviewCard } from "../reviews/ReviewCard";
import { ReviewModal, type ReviewCtx } from "../reviews/ReviewModal";
import { Button } from "../ui/Button";
import { Card, CardHeader } from "../ui/Card";
import { Chip } from "../ui/Chip";
import { SkillIcon } from "../ui/SkillIcon";
import { formatShort } from "@/lib/format";
import { tn, useT } from "@/lib/i18n";
import { useWorkerRating } from "@/lib/ratings";
import { isRevealed, reviewState } from "@/lib/reviews";
import { useStore } from "@/lib/store";
import { kamgarJobs } from "@/lib/trust";

/** The worker rates the contractor for each job they worked on. */
export function RateContractorsCard() {
  const t = useT();
  const { jobs, applications, reviews } = useStore();
  const [ctx, setCtx] = useState<ReviewCtx | null>(null);
  const done = kamgarJobs(currentWorkerId, applications, jobs);
  const mine = useWorkerRating(currentWorkerId);

  return (
    <Card>
      <CardHeader title="Reviews" subtitle="Rate your contractors honestly. It protects every worker." />
      <div className="px-4 pb-6 md:px-8 md:pb-8">
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl bg-canvas p-4">
          {mine.stats.avg ? (
            <>
              <Stars value={mine.stats.avg} size={20} /><span className="text-xl tabular-nums">{mine.stats.avg.toFixed(1)}</span>
              <span className="text-sm text-ink-mute">{t("Your rating from contractors")} · {mine.stats.count === 1 ? t("{n} review", { n: 1 }) : t("{n} reviews", { n: mine.stats.count })}</span>
            </>
          ) : <span className="text-sm text-ink-mute">{t("No reviews yet")}</span>}
        </div>
        <ul className="space-y-3">
          {done.map((j) => {
            const rs = reviewState(j, currentWorkerId, "worker", applications, reviews);
            const theirs = reviews.find((r) => r.jobId === j.id && r.workerId === currentWorkerId && r.by === "contractor");
            const revealed = isRevealed(reviews, j, j.id, currentWorkerId);
            return (
              <li key={j.id} className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-2xl bg-canvas p-4">
                <SkillIcon skill={j.skill} size={48} />
                <div className="min-w-0 flex-1 basis-48">
                  <div className="truncate text-[16px] text-ink">{t(j.title)}</div>
                  <div className="truncate text-xs text-ink-mute tabular-nums">{t(contractorOf(j.contractorId).company)} · {formatShort(j.startDate)} – {formatShort(j.endDate)}</div>
                  {theirs && !revealed && rs.state !== "done" && <div className="mt-1 text-xs text-warn-fg"><Lock size={11} className="mr-1 inline" />{t("{name} has reviewed you. Submit yours to see it.", { name: t(contractorOf(j.contractorId).company) })}</div>}
                </div>
                {rs.state === "open" && <Button size="sm" variant="primary" icon={<Star size={16} />} onClick={() => setCtx({ job: j, workerId: currentWorkerId, by: "worker" })}>{t("Rate {name}", { name: t(contractorOf(j.contractorId).company) })}</Button>}
                {rs.state === "done" && (revealed
                  ? <Chip tone="green"><Check size={12} className="mr-0.5 inline" />{t("You reviewed")} · {rs.review.rating}/5</Chip>
                  : <Chip tone="amber"><Lock size={12} className="mr-0.5 inline" />{t("Submitted. Hidden until they review too")}</Chip>)}
                {rs.state === "locked" && <Chip tone="slate">{t("Reviews open when the job ends")}</Chip>}
              </li>
            );
          })}
          {done.length === 0 && <li className="py-4 text-center text-sm text-ink-mute">{t("Reviews open after your first job.")}</li>}
        </ul>
      </div>
      <ReviewModal ctx={ctx} onClose={() => setCtx(null)} />
    </Card>
  );
}

/** Public reviews about the signed-in worker. */
export function ReviewsAboutMe() {
  const t = useT();
  const { list, stats } = useWorkerRating(currentWorkerId);
  return (
    <Card>
      <CardHeader title="Reviews about me" subtitle={tn(t, list.length, "{n} review", "{n} reviews")} />
      <div className="px-4 pb-6 md:px-8 md:pb-8">
        <RatingSummary stats={stats} className="mb-5" />
        <div className="space-y-3">{list.map((r) => <ReviewCard key={r.id} review={r} />)}</div>
      </div>
    </Card>
  );
}

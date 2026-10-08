"use client";
import { ArrowLeft, Check, Lock, MapPin, MessageSquareText, ShieldCheck, Star, UserX } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useMemo, useState } from "react";
import { currentWorkerId, CITY } from "@/data/jobs";
import { workers } from "@/data/workers";
import { RatingSummary, Stars } from "@/components/reviews/Stars";
import { ReviewCard } from "@/components/reviews/ReviewCard";
import { ReviewModal, type ReviewCtx } from "@/components/reviews/ReviewModal";
import { ApplicantActions } from "@/components/shared/ApplicantParts";
import { ProgressRing } from "@/components/worker/ProgressRing";
import { TrustChip, VerifyBadges, WorkGallery } from "@/components/worker/TrustParts";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkillIcon } from "@/components/ui/SkillIcon";
import { formatShort, rateLabel, TODAY, yrs } from "@/lib/format";
import { tn, useT } from "@/lib/i18n";
import { useWorkerRating } from "@/lib/ratings";
import { WORKER_CRITERIA, isRevealed, reviewState } from "@/lib/reviews";
import { useStore } from "@/lib/store";
import { kamgarJobs, trustFor } from "@/lib/trust";

export default function WorkerProfilePageForContractor() {
  return <Suspense><WorkerProfile /></Suspense>;
}

function WorkerProfile() {
  const id = useSearchParams().get("id") ?? "";
  const t = useT();
  const { profile, applications, jobs, reviews } = useStore();
  const [ctx, setCtx] = useState<ReviewCtx | null>(null);
  const worker = workers.find((w) => w.id === id);
  const rating = useWorkerRating(id);

  const history = useMemo(() => kamgarJobs(id, applications, jobs), [id, applications, jobs]);
  const apps = useMemo(
    () => applications.filter((a) => a.workerId === id).sort((a, b) => Number(b.status === "pending") - Number(a.status === "pending") || b.appliedOn.localeCompare(a.appliedOn)),
    [applications, id],
  );

  if (!worker) {
    return <Card><EmptyState icon={<UserX size={24} />} title="Worker not found" body="This profile may have been removed." action={<Button variant="primary" href="/applicants">{t("Back to Applicants")}</Button>} /></Card>;
  }

  const own = id === currentWorkerId && profile.onboarded;
  const tr = trustFor(id, profile, currentWorkerId);
  const jobOf = (jobId: string) => jobs.find((j) => j.id === jobId)!;
  const avgCrit = [0, 1, 2].map((i) => (rating.list.length ? rating.list.reduce((s, r) => s + r.criteria[i], 0) / rating.list.length : 0));
  const docs = [
    { ok: tr.upi, label: "Payout details added" }, { ok: tr.refs > 0, label: "Has a reference" }, { ok: tr.works.length > 0, label: "Past work shown" },
  ];
  const langs = worker.languages;

  return (
    <div>
      <Link href="/applicants" className="on-dark mb-4 inline-flex min-h-11 items-center gap-2 text-[15px] text-white/85 hover:text-white"><ArrowLeft size={16} />{t("Back to Applicants")}</Link>

      {/* Header */}
      <Card className="p-6 md:p-10">
        <div className="flex flex-wrap items-center gap-x-10 gap-y-6">
          <div className="flex min-w-0 flex-1 basis-[340px] items-center gap-6">
            {own && profile.photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.photo} alt={t(worker.name)} className="h-28 w-28 shrink-0 rounded-full object-cover md:h-36 md:w-36" />
            ) : <Avatar name={worker.name} size={136} className="max-md:!h-28 max-md:!w-28" />}
            <div className="min-w-0">
              <h1 className="text-[32px] font-normal leading-tight tracking-tight md:text-[44px]">{t(worker.name)}</h1>
              <p className="mt-1 flex flex-wrap items-center gap-x-2 text-[15px] text-ink-mute">
                <span>{t(worker.skill)}</span><span aria-hidden>·</span><span className="inline-flex items-center gap-1"><MapPin size={13} />{t(worker.area)}, {t(CITY)}</span><span aria-hidden>·</span><span>{yrs(worker.experience)}</span>
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-2"><Stars value={rating.rating} size={18} /><span className="tabular-nums text-ink">{rating.rating.toFixed(1)}</span>
                  <span className="text-sm text-ink-mute">({rating.stats.count === 1 ? t("{n} review", { n: 1 }) : t("{n} reviews", { n: rating.stats.count })})</span></span>
                <TrustChip level={tr.level} />
                {tr.availability && <Chip tone={tr.availability === "now" ? "green" : tr.availability === "week" ? "amber" : "slate"}>{t(tr.availability === "now" ? "Available now" : tr.availability === "week" ? "Available within a week" : "Not available now")}</Chip>}
              </div>
              {tr.rate ? <p className="mt-3 text-[15px] text-ink-soft tabular-nums">{t("Expected pay")}: <b className="font-medium text-ink">₹{tr.rate.toLocaleString("en-IN")} {t("per day")}</b></p> : null}
            </div>
          </div>
          <div className="flex items-center gap-5">
            <ProgressRing value={tr.score} size={128} label={t("Profile strength")} />
            <div className="text-sm text-ink-mute"><div className="text-lg text-ink">{t("Profile strength")}</div>{tn(t, history.filter((j) => j.closed).length, "{n} job completed on Kamgar", "{n} jobs completed on Kamgar")}</div>
          </div>
        </div>
        <div className="mt-6 border-t border-line pt-5"><VerifyBadges trust={tr} /></div>
      </Card>

      {/* Decide */}
      <Card className="mt-5">
        <CardHeader title="Applications to your jobs" subtitle={apps.length ? tn(t, apps.length, "{n} application", "{n} applications") : "No applications yet"} />
        <ul className="space-y-3 px-4 pb-6 md:px-8 md:pb-8">
          {apps.map((a) => {
            const j = jobOf(a.jobId);
            return (
              <li key={a.id} className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-2xl bg-canvas p-4">
                <SkillIcon skill={j.skill} size={52} />
                <div className="min-w-0 flex-1 basis-52">
                  <div className="truncate text-[17px] text-ink">{t(j.title)}</div>
                  <div className="truncate text-sm text-ink-mute tabular-nums">{t(j.area)} · {rateLabel(j)} · {t("Applied {date}", { date: formatShort(a.appliedOn) })}</div>
                </div>
                <ApplicantActions app={a} />
              </li>
            );
          })}
          {apps.length === 0 && <li className="py-4 text-center text-sm text-ink-mute">{t("This worker has not applied to any of your jobs.")}</li>}
        </ul>
      </Card>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Work */}
        <Card className="lg:col-span-7">
          <CardHeader title="Work I have done" subtitle={tn(t, tr.works.length, "{n} project", "{n} projects")} />
          <div className="px-4 pb-6 md:px-8 md:pb-8">
            {tr.works.length ? <WorkGallery works={tr.works} cols="sm:grid-cols-2" /> : <p className="py-6 text-center text-sm text-ink-mute">{t("No past work added yet.")}</p>}
          </div>
        </Card>

        <div className="space-y-5 lg:col-span-5">
          <Card>
            <CardHeader title="Profile checks" subtitle="Based on what this worker has added." />
            <ul className="space-y-2 px-4 pb-6 md:px-6">
              {docs.map((d) => (
                <li key={d.label} className="flex items-center gap-3 rounded-2xl bg-canvas p-3">
                  <span className={`flex h-9 w-9 items-center justify-center rounded-full ${d.ok ? "bg-ok-bg text-ok-fg" : "bg-white text-ink-mute"}`}>{d.ok ? <Check size={18} /> : <Lock size={15} />}</span>
                  <span className={`flex-1 text-[15px] ${d.ok ? "text-ink" : "text-ink-mute"}`}>{t(d.label)}</span>
                  <span className="text-xs text-ink-mute">{d.ok ? t("Added") : t("Not yet")}</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <CardHeader title="About" />
            <div className="space-y-4 px-6 pb-6 md:px-8">
              <p className="text-[15px] text-ink-soft">{tr.about || t("This worker has not written an introduction yet.")}</p>
              <div className="flex flex-wrap gap-2">{langs.map((l) => <Chip key={l} tone="slate">{t(l)}</Chip>)}</div>
            </div>
          </Card>
        </div>
      </div>

      {/* Work history with reviews */}
      <Card className="mt-5">
        <CardHeader title="Verified on Kamgar" subtitle="Jobs this worker did through Kamgar" />
        <ul className="space-y-3 px-4 pb-6 md:px-8 md:pb-8">
          {history.map((j) => {
            const rs = reviewState(j, id, "contractor", applications, reviews);
            const revealed = isRevealed(reviews, j, j.id, id);
            return (
              <li key={j.id} className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-2xl bg-canvas p-4">
                <SkillIcon skill={j.skill} size={48} />
                <div className="min-w-0 flex-1 basis-52">
                  <div className="truncate text-[16px] text-ink">{t(j.title)}</div>
                  <div className="truncate text-xs text-ink-mute tabular-nums">{t(j.area)} · {formatShort(j.startDate)} – {formatShort(j.endDate)} · {j.endDate < TODAY || j.closed ? t("Completed") : t("Ongoing")}</div>
                </div>
                {rs.state === "open" && <Button size="sm" variant="primary" icon={<Star size={16} />} onClick={() => setCtx({ job: j, workerId: id, by: "contractor" })}>{t("Write a review")}</Button>}
                {rs.state === "done" && (revealed
                  ? <Chip tone="green"><Check size={12} className="mr-0.5 inline" />{t("You reviewed")} · {rs.review.rating}/5</Chip>
                  : <Chip tone="amber"><Lock size={12} className="mr-0.5 inline" />{t("Submitted. Hidden until {name} reviews too", { name: t(worker.name) })}</Chip>)}
                {rs.state === "locked" && rs.reason === "notEnded" && <Chip tone="slate">{t("Reviews open when the job ends")}</Chip>}
              </li>
            );
          })}
          {history.length === 0 && <li className="py-4 text-center text-sm text-ink-mute">{t("No jobs done through Kamgar yet.")}</li>}
        </ul>
      </Card>

      {/* Reviews */}
      <Card className="mt-5">
        <CardHeader title="Reviews from contractors" subtitle="Every review is tied to a real job" />
        <div className="px-4 pb-6 md:px-8 md:pb-8">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <RatingSummary stats={rating.stats} />
              {rating.list.length > 0 && (
                <ul className="mt-5 space-y-2 border-t border-line pt-4">
                  {WORKER_CRITERIA.map((l, i) => (
                    <li key={l} className="flex items-center justify-between gap-3 text-sm"><span className="text-ink-soft">{t(l)}</span><span className="inline-flex items-center gap-2"><Stars value={avgCrit[i]} size={13} /><span className="w-7 tabular-nums">{avgCrit[i].toFixed(1)}</span></span></li>
                  ))}
                </ul>
              )}
              <p className="mt-5 flex gap-2 rounded-2xl bg-canvas p-3 text-xs text-ink-mute"><ShieldCheck size={15} className="mt-0.5 shrink-0 text-ok-fg" />{t("Reviews can only be written after a finished job, once per side, and stay hidden until both have reviewed.")}</p>
            </div>
            <div className="space-y-3 lg:col-span-8">
              {rating.list.map((r) => <ReviewCard key={r.id} review={r} />)}
              {rating.list.length === 0 && <div className="rounded-2xl bg-canvas p-8 text-center text-sm text-ink-mute"><MessageSquareText className="mx-auto mb-2" />{t("No reviews yet")}</div>}
            </div>
          </div>
        </div>
      </Card>

      <ReviewModal ctx={ctx} onClose={() => setCtx(null)} />
    </div>
  );
}

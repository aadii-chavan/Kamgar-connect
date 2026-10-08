"use client";
import { ArrowRight, BadgeCheck, Star, Image as ImageIcon, ShieldCheck, Users, Wallet } from "lucide-react";
import { workerHref } from "@/lib/links";
import { currentWorkerId } from "@/data/jobs";
import { useT, tn } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import { useWorkerRating } from "@/lib/ratings";
import { Stars } from "../reviews/Stars";
import { Button } from "../ui/Button";
import { LEVEL_LABEL, LEVEL_TONE, kamgarJobs, trustFor, type TrustLevel, type TrustSummary } from "@/lib/trust";
import { ProgressRing } from "./ProgressRing";
import { ImagePlaceholder } from "../ui/ImagePlaceholder";
import { Chip } from "../ui/Chip";
import { Lightbox, type Slide } from "../ui/Lightbox";
import { useState } from "react";
import { cn } from "../ui/cn";

export function TrustChip({ level }: { level: TrustLevel }) {
  const t = useT();
  return (
    <Chip tone={LEVEL_TONE[level]} className="gap-1.5">
      <ShieldCheck size={13} aria-hidden />{t(LEVEL_LABEL[level])}
    </Chip>
  );
}

/** Small round badges: payout details and references. */
export function VerifyBadges({ trust, className }: { trust: TrustSummary; className?: string }) {
  const t = useT();
  const items = [{ on: trust.upi, icon: Wallet, label: "Payout details added" }];
  return (
    <ul className={cn("flex flex-wrap gap-2", className)}>
      {items.map((i) => (
        <li key={i.label} className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px]", i.on ? "bg-ok-bg text-ok-fg" : "bg-canvas text-ink-mute line-through decoration-ink-mute/40")}>
          <i.icon size={14} aria-hidden />{t(i.label)}
        </li>
      ))}
      <li className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px]", trust.refs ? "bg-ok-bg text-ok-fg" : "bg-canvas text-ink-mute")}>
        <Users size={14} aria-hidden />{tn(t, trust.refs, "{n} reference", "{n} references")}
      </li>
    </ul>
  );
}

export type WorkLike = TrustSummary["works"][number];
export const photoCount = (w: WorkLike) => (w.images.length || 3);

/** A grid of past projects that opens a photo viewer across all photos. */
export function WorkGallery({ works, cols = "sm:grid-cols-2" }: { works: WorkLike[]; cols?: string }) {
  const t = useT();
  const [open, setOpen] = useState<number | null>(null);
  const slides: Slide[] = [];
  const starts: number[] = [];
  works.forEach((w) => {
    starts.push(slides.length);
    const n = photoCount(w);
    for (let i = 0; i < n; i++) {
      slides.push({
        key: `${w.id}-${i}`, title: t(w.title), meta: `${t(w.skill)} · ${t(w.area)} · ${w.year} · ${i + 1}/${n}`, body: w.description,
        node: w.images[i]
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={w.images[i]} alt={`${w.title} ${i + 1}`} />
          : <ImagePlaceholder skill={w.skill} label={t(w.title)} />,
      });
    }
  });
  return (
    <>
      <div className={cn("grid grid-cols-1 gap-3", cols)}>
        {works.map((w, i) => <WorkTile key={w.id} work={w} onClick={() => setOpen(starts[i])} />)}
      </div>
      {open !== null && <Lightbox slides={slides} start={open} onClose={() => setOpen(null)} />}
    </>
  );
}

/** A past project: first photo, or a tinted tile when there is none. */
export function WorkTile({ work, onClick, actions }: { work: WorkLike; onClick?: () => void; actions?: React.ReactNode }) {
  const t = useT();
  const cover = work.images[0];
  return (
    <article className="overflow-hidden rounded-2xl bg-canvas">
      <button type="button" onClick={onClick} disabled={!onClick} className="relative block aspect-[4/3] w-full overflow-hidden bg-white text-left disabled:cursor-default" aria-label={t(work.title)}>
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt={t(work.title)} className="h-full w-full object-cover" />
        ) : (
          <ImagePlaceholder skill={work.skill} label={t(work.title)} />
        )}
        {photoCount(work) > 1 && (
          <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-ink/75 px-2 py-0.5 text-xs text-white"><ImageIcon size={12} />{photoCount(work)}</span>
        )}
      </button>
      <div className="flex items-start justify-between gap-2 p-3">
        <div className="min-w-0">
          <div className="truncate text-[15px] text-ink">{t(work.title)}</div>
          <div className="truncate text-xs text-ink-mute">{t(work.area)} · {work.year}</div>
        </div>
        {actions}
      </div>
    </article>
  );
}

export const VerifiedMark = () => <BadgeCheck size={16} className="text-ok-fg" aria-hidden />;

/** Compact "shield + score" chip for tables. */
export function TrustPill({ workerId }: { workerId: string }) {
  const t = useT();
  const { profile } = useStore();
  const tr = trustFor(workerId, profile, currentWorkerId);
  return (
    <Chip tone={LEVEL_TONE[tr.level]} className="gap-1.5">
      <ShieldCheck size={13} aria-hidden /><span className="tabular-nums" aria-label={`${t(LEVEL_LABEL[tr.level])} ${tr.score}%`}>{tr.score}%</span>
    </Chip>
  );
}

/** What a contractor sees when reviewing a worker: score, reviews and past work. */
export function TrustSection({ workerId, showProfileLink = true }: { workerId: string; showProfileLink?: boolean }) {
  const t = useT();
  const { profile, applications, jobs } = useStore();
  const tr = trustFor(workerId, profile, currentWorkerId);
  const done = kamgarJobs(workerId, applications, jobs).filter((j) => j.closed).length;
  const { stats } = useWorkerRating(workerId);
  return (
    <section aria-label={t("Trust and profile")} className="mt-6 rounded-2xl bg-canvas p-5">
      <div className="flex items-center gap-4">
        <ProgressRing value={tr.score} size={84} stroke={9} label={t("Profile strength")} />
        <div className="min-w-0">
          <div className="text-[17px] text-ink">{t("Trust and profile")}</div>
          <div className="mt-1.5"><TrustChip level={tr.level} /></div>
          <div className="mt-1.5 text-xs text-ink-mute">{tn(t, done, "{n} job completed on Kamgar", "{n} jobs completed on Kamgar")}</div>
        </div>
      </div>
      <VerifyBadges trust={tr} className="mt-4" />
      {stats.avg && (
        <div className="mt-4 flex items-center gap-2 rounded-xl bg-white p-3 text-sm">
          <Stars value={stats.avg} size={16} /><span className="tabular-nums text-ink">{stats.avg.toFixed(1)}</span>
          <span className="text-ink-mute">· {stats.count === 1 ? t("{n} review", { n: 1 }) : t("{n} reviews", { n: stats.count })}</span>
        </div>
      )}
      {tr.about && <p className="mt-3 rounded-xl bg-white p-3 text-sm text-ink-soft">{tr.about}</p>}
      <div className="mt-5 text-sm text-ink-mute">{t("Past work")} · {tn(t, tr.works.length, "{n} project", "{n} projects")}</div>
      {tr.works.length > 0 ? <div className="mt-3"><WorkGallery works={tr.works.slice(0, 4)} /></div> : <p className="mt-2 text-sm text-ink-mute">{t("No past work added yet.")}</p>}
      {showProfileLink && <Button variant="primary" href={workerHref(workerId)} className="mt-5 w-full" icon={<ArrowRight size={18} />}>{t("View full profile")}</Button>}
    </section>
  );
}

/** "★ 4.8 (3)" used in tables and headers. */
export function RatingCell({ workerId }: { workerId: string }) {
  const { rating, stats } = useWorkerRating(workerId);
  return (
    <span className="inline-flex items-center gap-1 tabular-nums">
      <Star size={14} className="fill-[#F2A93B] text-[#F2A93B]" />{rating.toFixed(1)}<span className="text-xs text-ink-mute">({stats.count})</span>
    </span>
  );
}

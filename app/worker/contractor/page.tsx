"use client";
import { BadgeCheck, Building2, Check, MapPin } from "lucide-react";
import { RatingSummary, Stars } from "@/components/reviews/Stars";
import { ReviewCard } from "@/components/reviews/ReviewCard";
import { AmenityChips } from "@/components/site/AmenityChips";
import { ProgressRing } from "@/components/worker/ProgressRing";
import { TrustChip } from "@/components/worker/TrustParts";
import { Avatar } from "@/components/ui/Avatar";
import { ImagePlaceholder } from "@/components/ui/ImagePlaceholder";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { StatCard } from "@/components/ui/PageHeader";
import { cn } from "@/components/ui/cn";
import { TODAY } from "@/lib/format";
import { tn, useT } from "@/lib/i18n";
import { useContractorRating, useContractorTrust } from "@/lib/ratings";
import { useStore } from "@/lib/store";
import { Briefcase, Users, Wallet } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { contractorOf } from "@/data/jobs";

const KIND = { individual: "Individual", firm: "Firm", company: "Company" } as const;

/** The contractor as a worker sees them: who they are, their sites, how they treat workers. */
export default function WorkerContractorPage() {
  return <Suspense><Inner /></Suspense>;
}

function Inner() {
  const t = useT();
  const { jobs } = useStore();
  const wanted = useSearchParams().get("id") ?? jobs[0]?.contractorId ?? "";
  const ct = useContractorTrust(wanted);
  const { stats, list, onTimePct } = useContractorRating(wanted);
  const theirJobs = jobs.filter((j) => j.contractorId === wanted);
  const open = theirJobs.filter((j) => !j.closed && j.endDate >= TODAY).length;
  const p = { ...ct.p, company: ct.p.company || contractorOf(wanted).company };
  const badges = [
    { on: ct.sites.some((s) => s.amenities.length >= 3), label: "Safe sites described", icon: Building2 },
    { on: !!p.upi, label: "UPI payouts set", icon: BadgeCheck },
    { on: p.pledge, label: "Fair-pay pledge", icon: Check },
  ];

  return (
    <div className="space-y-5">
      <Card className="p-6 md:p-10">
        <div className="flex flex-wrap items-center gap-x-8 gap-y-6">
          <div className="flex min-w-0 flex-1 basis-[320px] items-center gap-5">
            {p.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.logo} alt={p.company} className="h-24 w-24 shrink-0 rounded-3xl object-cover md:h-28 md:w-28" />
            ) : <Avatar name={p.company || "Contractor"} size={112} className="max-md:!h-24 max-md:!w-24 !rounded-3xl" />}
            <div className="min-w-0">
              <h1 className="truncate text-[30px] font-normal leading-tight tracking-tight md:text-[40px]">{t(p.company || "Contractor")}</h1>
              <p className="mt-1 text-[15px] text-ink-mute">{t(KIND[p.kind])} · {tn(t, p.yearsInBusiness, "{n} year in business", "{n} years in business")} · {t(p.city)}</p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <TrustChip level={ct.level} />
                {stats.avg && <span className="inline-flex items-center gap-2 text-sm"><Stars value={stats.avg} size={16} /><span className="tabular-nums">{stats.avg.toFixed(1)}</span><span className="text-ink-mute">({stats.count})</span></span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-5">
            <ProgressRing value={ct.score} size={120} label={t("Profile strength")} />
            <div className="max-w-[200px] text-sm text-ink-mute"><div className="text-lg text-ink">{t("Trust score")}</div>{t("Based on profile, sites and worker reviews")}</div>
          </div>
        </div>
        <ul className="mt-6 flex flex-wrap gap-2 border-t border-line pt-5">
          {badges.map((b) => (
            <li key={b.label} className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px]", b.on ? "bg-ok-bg text-ok-fg" : "bg-canvas text-ink-mute line-through decoration-ink-mute/40")}><b.icon size={14} aria-hidden />{t(b.label)}</li>
          ))}
        </ul>
      </Card>

      <div className="grid grid-cols-2 gap-5 xl:grid-cols-3">
        <StatCard label="Jobs posted" value={theirJobs.length} icon={<Briefcase size={22} strokeWidth={1.6} />} />
        <StatCard label="Open jobs" value={open} icon={<Users size={22} strokeWidth={1.6} />} />
        <StatCard label="Paid on time" value={stats.count ? `${onTimePct}%` : "—"} tone="green" icon={<Wallet size={22} strokeWidth={1.6} />} hint={stats.count ? t("From worker reviews") : undefined} />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <Card className="lg:col-span-7">
          <CardHeader title="About" />
          <div className="space-y-4 px-6 pb-6 md:px-8 md:pb-8">
            <p className="text-[15px] text-ink-soft">{p.about || t("This contractor has not written an introduction yet.")}</p>
            <div className="flex flex-wrap gap-2">{p.trades.map((x) => <Chip key={x} tone="slate">{t(x)}</Chip>)}</div>
          </div>
        </Card>
        <Card className="lg:col-span-5">
          <CardHeader title="Fair-pay pledge" />
          <div className="px-6 pb-6 md:px-8 md:pb-8">
            {p.pledge ? (
              <ul className="space-y-2 text-[15px] text-ink-soft">
                {["Pays the agreed wage on the day the work is approved.", "Gives drinking water, a toilet and safety gear on every site.", "Treats every worker with respect and settles disputes fairly."].map((x) => (
                  <li key={x} className="flex items-start gap-2"><Check size={16} className="mt-1 shrink-0 text-ok-fg" />{t(x)}</li>
                ))}
              </ul>
            ) : <p className="text-sm text-ink-mute">{t("This contractor has not taken the fair-pay pledge yet.")}</p>}
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title="Sites" subtitle={tn(t, ct.sites.length, "{n} site", "{n} sites")} />
        <div className="grid grid-cols-1 gap-4 px-4 pb-6 md:px-8 md:pb-8 sm:grid-cols-2 xl:grid-cols-3">
          {ct.sites.map((s) => (
            <article key={s.id} className="overflow-hidden rounded-2xl bg-canvas">
              <div className="aspect-[16/9] w-full overflow-hidden bg-white">
                {s.photos[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.photos[0]} alt={s.name} className="h-full w-full object-cover" />
                ) : <ImagePlaceholder skill={s.kind === "commercial" ? "Electrician" : "Mason"} label={s.name} />}
              </div>
              <div className="space-y-2 p-4">
                <h3 className="text-[17px] text-ink">{s.name}</h3>
                <p className="flex items-center gap-1 text-xs text-ink-mute"><MapPin size={12} />{t(s.area)}</p>
                <AmenityChips amenities={s.amenities} compact max={7} />
              </div>
            </article>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader title="Reviews from workers" subtitle="Every review is tied to a real job" />
        <div className="grid grid-cols-1 gap-6 px-4 pb-6 md:px-8 md:pb-8 lg:grid-cols-12">
          <div className="lg:col-span-4"><RatingSummary stats={stats} /></div>
          <div className="space-y-3 lg:col-span-8">{list.slice(0, 5).map((r) => <ReviewCard key={r.id} review={r} />)}</div>
        </div>
      </Card>
      <div className="text-center"><Button variant="light" href="/worker/jobs">{t("Back to Find Jobs")}</Button></div>
    </div>
  );
}

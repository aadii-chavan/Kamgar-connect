"use client";
import { AlertCircle, ArrowRight, Briefcase, Check, ChevronRight, Clock, ShieldCheck, Star, UserCheck, UserPlus, Wallet, X } from "lucide-react";
import { jobHref } from "@/lib/links";
import Link from "next/link";
import { useMemo, type ReactNode } from "react";
import { contractor } from "@/data/jobs";
import { workerById } from "@/data/workers";
import { OverviewChart } from "@/components/dashboard/OverviewChart";
import { Scheduler } from "@/components/dashboard/Scheduler";
import { StaffingChart } from "@/components/dashboard/StaffingChart";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardPlus } from "@/components/ui/Card";
import { PayChip } from "@/components/ui/Chip";
import { Donut } from "@/components/ui/Donut";
import { Money } from "@/components/ui/Money";
import { StatCard } from "@/components/ui/PageHeader";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { SkillIcon } from "@/components/ui/SkillIcon";
import { useDecision } from "@/lib/decisions";
import { TODAY, addDays, formatDate, formatINR, formatMonth, formatShort, rateLabel, yrs } from "@/lib/format";
import { tn, useT } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import { pendingReviews } from "@/lib/reviews";
import { contractorScore } from "@/lib/contractorTrust";
import { useContractorRating } from "@/lib/ratings";
import { useNow } from "@/lib/live";
import { fmtClock } from "@/lib/time";
import { bucketOf, isOverdue } from "@/lib/shifts";

function Trend({ dir, tone, children }: { dir: "up" | "down"; tone: "good" | "bad" | "plain"; children: ReactNode }) {
  const cls = tone === "good" ? "text-ok-fg" : tone === "bad" ? "text-bad-fg" : "text-ink-soft";
  return <span className={cls}><span aria-hidden>{dir === "up" ? "↗" : "↘"}</span> {children}</span>;
}

export default function DashboardPage() {
  const decide = useDecision();
  const t = useT();
  const { jobs, applications, payroll, filled, acceptedWorkers, shiftOf, statusOf, reviews, contractorProfile, sites } = useStore();
  const { stats: workerStats } = useContractorRating();
  const now = useNow(4000);

  const d = useMemo(() => {
    const active = jobs.filter((j) => !j.closed && j.endDate >= TODAY);
    const pending = applications.filter((a) => a.status === "pending").sort((a, b) => b.appliedOn.localeCompare(a.appliedOn));
    // Live buckets from today's shifts: on site / finished / on the way / not started.
    const onSite = { P: 0, H: 0, A: 0, unmarked: 0, late: 0, waiting: 0 };
    for (const j of active.filter((j) => j.startDate <= TODAY)) {
      for (const w of acceptedWorkers(j.id)) {
        const sh = shiftOf(j, w);
        const b = bucketOf(sh.status);
        if (b === "onSite") onSite.P += 1; else if (b === "finished") onSite.H += 1; else if (b === "onTheWay") onSite.A += 1; else onSite.unmarked += 1;
        if (isOverdue(j, sh, now)) onSite.late += 1;
        if (sh.status === "done") onSite.waiting += 1;
      }
    }
    const unpaid = payroll.filter((r) => r.status !== "paid");
    const overdue = payroll.filter((r) => r.status === "overdue");
    const startingSoon = active.filter((j) => j.startDate > TODAY && j.startDate <= addDays(TODAY, 7) && filled(j.id) < j.needed);
    const order = { overdue: 0, pending: 1, paid: 2 } as const;
    const recent = [...payroll].sort((a, b) => order[a.status] - order[b.status] || b.amount - a.amount).slice(0, 4);
    return {
      active, pending, onSite, overdue, startingSoon, recent,
      newJobs: active.filter((j) => j.postedOn >= addDays(TODAY, -7)).length,
      newApplicants: pending.filter((a) => a.appliedOn >= addDays(TODAY, -1)).length,
      pendingPay: unpaid.reduce((s, r) => s + r.amount, 0), unpaidCount: unpaid.length,
      filledTotal: active.reduce((s, j) => s + filled(j.id), 0), neededTotal: active.reduce((s, j) => s + j.needed, 0),
    };
  }, [jobs, applications, payroll, acceptedWorkers, shiftOf, filled, now]);


  const present = d.onSite.P + d.onSite.H;
  const assigned = present + d.onSite.A + d.onSite.unmarked;
  const onSiteNow = d.onSite.P;
  const featured = [...d.active].filter((j) => filled(j.id) < j.needed).sort((a, b) => a.startDate.localeCompare(b.startDate))[0] ?? d.active[0];
  const trustScore = contractorScore(contractorProfile, sites, workerStats.count);
  const attention = [
    trustScore < 70 && { icon: ShieldCheck, href: "/profile", text: t("Complete your profile"), sub: t("A complete profile gets more and better applicants. Profile strength {n}%", { n: trustScore }) },
    d.pending.length > 0 && { icon: UserPlus, href: "/applicants?status=pending", text: tn(t, d.pending.length, "{n} applicant to review", "{n} applicants to review"), sub: t("Accept or reject to fill your jobs") },
    ...d.startingSoon.map((j) => ({ icon: Briefcase, href: jobHref(j.id, "applicants"), text: t("{job} starts {date}", { job: t(j.title), date: formatShort(j.startDate) }), sub: `${t("{n} more needed", { n: j.needed - filled(j.id) })} · ${t(j.area)}` })),
    d.onSite.waiting > 0 && { icon: Check, href: "/live", text: tn(t, d.onSite.waiting, "{n} shift waiting for your approval", "{n} shifts waiting for your approval"), sub: t("Workers finished the day. Review their hours and photos.") },
    d.onSite.late > 0 && { icon: Clock, href: "/live", text: tn(t, d.onSite.late, "{n} worker late to start", "{n} workers late to start"), sub: t("Past the reporting time and not on the way") },
    ...(() => {
      const owed = pendingReviews("contractor", jobs, applications, reviews);
      return owed.length ? [{ icon: Star, href: jobHref(owed[0].job.id, "reviews"), text: tn(t, owed.length, "{n} worker waiting for your review", "{n} workers waiting for your review"), sub: `${t(owed[0].job.title)} · ${t("Reviews keep hiring honest")}` }] : [];
    })(),
    ...d.overdue.map((r) => ({ icon: AlertCircle, href: "/payments?status=overdue", text: t("{amount} overdue", { amount: formatINR(r.amount) }), sub: `${t(workerById(r.workerId).name)} · ${t(r.job.title)}` })),
  ].filter(Boolean) as { icon: typeof Clock; href: string; text: string; sub: string }[];

  return (
    <div>
      {/* Hero */}
      <section className="on-dark relative pt-4 md:pt-10">
        <div className="grid items-start gap-10 grid-cols-1 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <p className="text-lg text-white/85">{t("Track your jobs, applicants, attendance and payouts")}</p>
            <h1 className="mt-6 text-[46px] font-medium leading-[1] tracking-[-0.04em] text-white md:mt-10 md:text-[84px]">
              {t("Welcome Back, {name}!", { name: t(contractor.name.split(" ")[0]) })}
            </h1>
            <div className="mt-8 flex flex-wrap gap-3 md:mt-12">
              <Button variant="light" href="/jobs/new" icon={<ArrowRight size={18} />} className="min-w-[220px] !min-h-14 flex-row-reverse">{t("Post a Job")}</Button>
              <Button variant="light" href="/applicants?status=pending" className="min-w-[220px] !min-h-14">{t("Review applicants")}</Button>
            </div>
          </div>

          <Link
            href="/payments" aria-label={t("Pending Payouts")}
            className="relative mx-auto block w-full max-w-[540px] pt-10 text-white lg:col-span-5 lg:ml-auto lg:mr-0 lg:-mb-28"
          >
            <span aria-hidden className="glass absolute inset-x-12 top-0 h-24 rounded-t-3xl opacity-50" />
            <span aria-hidden className="glass absolute inset-x-6 top-5 h-24 rounded-t-3xl opacity-75" />
            <span className="glass relative block rounded-3xl bg-white/20 p-7 text-center md:p-9">
              <span className="flex items-center justify-between text-[17px] tabular-nums text-white/90">
                <span className="flex items-center gap-5"><span>•••• {featured?.id.replace("J-", "")}</span><span>{featured ? `${formatShort(featured.startDate)} – ${formatShort(featured.endDate)}` : ""}</span></span>
                <span className="text-[26px] font-bold italic tracking-tight text-white/60">KAMGAR</span>
              </span>
              <span className="mt-7 block text-[48px] font-medium leading-none tracking-tight md:text-[60px]"><Money value={d.pendingPay} /></span>
              <span className="glass mx-auto mt-6 inline-flex items-center gap-2 rounded-full px-5 py-2 text-[15px] text-white/90">
                <span aria-hidden>↗</span>{tn(t, onSiteNow, "{n} worker on site now", "{n} workers on site now")}
              </span>
            </span>
          </Link>
        </div>
      </section>

      {/* Overview + stat tiles */}
      <div className="relative z-10 mt-10 grid gap-5 lg:mt-12 grid-cols-1 lg:grid-cols-12">
        <Card className="lg:col-span-7"><OverviewChart /></Card>
        <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:col-span-5">
          <StatCard label="Active Jobs" icon={<Briefcase size={22} strokeWidth={1.6} />} value={d.active.length}
            hint={<Trend dir="up" tone="good">{t("{n} new this week", { n: d.newJobs })}</Trend>} />
          <StatCard label="Pending Applicants" icon={<UserPlus size={22} strokeWidth={1.6} />} value={d.pending.length}
            hint={<Trend dir="up" tone="bad">{t("{n} since yesterday", { n: d.newApplicants })}</Trend>} />
          <StatCard label="Workers On Site Today" icon={<UserCheck size={22} strokeWidth={1.6} />} value={onSiteNow}
            hint={<Trend dir="up" tone="plain">{t("of {n} assigned", { n: assigned })}</Trend>} />
          <StatCard label="Pending Payouts" icon={<Wallet size={22} strokeWidth={1.6} />} value={<Money value={d.pendingPay} />}
            hint={<Trend dir="down" tone="plain">{tn(t, d.unpaidCount, "{n} payment due", "{n} payments due")}</Trend>} />
        </div>
      </div>

      {/* Recent payments + staffing */}
      <div className="mt-5 grid gap-5 grid-cols-1 lg:grid-cols-12">
        <Card className="lg:col-span-7">
          <CardHeader title="Recent Payments" action={<CardPlus href="/payments" label="Open payments" />} />
          <ul className="space-y-3 px-4 pb-6 md:px-8 md:pb-8">
            {d.recent.map((r) => (
              <li key={r.key}>
                <Link href={r.status === "paid" ? "/payments?status=paid" : `/payments?status=${r.status}`} className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl bg-canvas p-3 transition-colors hover:bg-accent-tint md:p-4">
                  <SkillIcon skill={r.job.skill} size={56} />
                  <div className="min-w-0 flex-1 basis-40">
                    <div className="truncate text-lg text-ink">{t(workerById(r.workerId).name)}</div>
                    <div className="truncate text-sm text-ink-mute">{t(r.job.title)} · {tn(t, r.days, "{n} day", "{n} days")}</div>
                  </div>
                  <PayChip status={r.status} />
                  <span className="hidden text-ink-soft tabular-nums sm:block">•••• {r.job.id.replace("J-", "")}</span>
                  <span className={`ml-auto text-xl tabular-nums ${r.status === "paid" ? "text-ok-fg" : "text-bad-fg"}`}>
                    {r.status === "paid" ? "+" : "-"}₹{r.amount.toLocaleString("en-IN")}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="flex flex-col p-6 md:p-8 lg:col-span-5">
          <div className="flex items-start justify-between">
            <h2 className="text-[22px] font-normal tracking-tight text-ink-soft">{t("Hiring Progress")}</h2>
            <CardPlus href="/jobs" label="Open jobs" />
          </div>
          <div className="mt-3 text-[48px] font-normal leading-none tracking-tight text-ink tabular-nums md:text-[56px]">
            {d.filledTotal}<span className="opacity-40"> / {d.neededTotal}</span>
          </div>
          <div className="mt-2 text-sm text-ink-mute">{t("positions filled across {n} active jobs", { n: d.active.length })}</div>
          <StaffingChart jobs={d.active} filled={filled} />
        </Card>
      </div>

      {/* Applicants, attention, scheduler */}
      <div className="mt-5 grid gap-5 grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardHeader title="Applicants" subtitle={t("{n} waiting for review", { n: d.pending.length })} action={<CardPlus href="/applicants?status=pending" label="Open applicants" />} />
          <ul className="space-y-1 px-4 pb-6 md:px-6">
            {d.pending.slice(0, 4).map((a) => {
              const w = workerById(a.workerId);
              const job = jobs.find((j) => j.id === a.jobId)!;
              return (
                <li key={a.id} className="flex items-center gap-3 py-2">
                  <Avatar name={w.name} size={48} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[15px] text-ink">{t(w.name)}</div>
                    <div className="truncate text-xs text-ink-mute">{t(w.skill)} · {yrs(w.experience)} · {t(job.area)}</div>
                  </div>
                  <button aria-label={t("Accept {name}", { name: t(w.name) })} onClick={() => decide(a, "accepted")} className="flex h-11 w-11 items-center justify-center rounded-full bg-ink text-white hover:bg-accent-hover"><Check size={18} /></button>
                  <button aria-label={t("Reject {name}", { name: t(w.name) })} onClick={() => decide(a, "rejected")} className="flex h-11 w-11 items-center justify-center rounded-full bg-canvas text-ink hover:bg-accent-tint"><X size={18} /></button>
                </li>
              );
            })}
            {d.pending.length === 0 && <li className="py-6 text-center text-sm text-ink-mute">{t("You are all caught up.")}</li>}
          </ul>
        </Card>

        <Card>
          <CardHeader title="Needs attention" subtitle={t("{n} items", { n: attention.length })} />
          <ul className="space-y-1 px-3 pb-6 md:px-5">
            {attention.map((a) => (
              <li key={a.text}>
                <Link href={a.href} className="group flex min-h-14 items-center gap-3 rounded-2xl px-3 py-2 transition-colors hover:bg-canvas">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-canvas text-ink"><a.icon size={19} strokeWidth={1.7} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] text-ink">{a.text}</span>
                    <span className="block truncate text-xs text-ink-mute">{a.sub}</span>
                  </span>
                  <ChevronRight size={18} className="shrink-0 text-ink-mute transition-transform group-hover:translate-x-0.5" />
                </Link>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="lg:col-span-2 xl:col-span-1">
          <CardHeader title="Scheduler" subtitle={formatMonth(TODAY.slice(0, 7))} action={<CardPlus href="/jobs" label="Open jobs" />} />
          <Scheduler jobs={jobs} />
        </Card>
      </div>

      {/* Active jobs + attendance */}
      <div className="mt-5 grid gap-5 grid-cols-1 lg:grid-cols-12">
        <Card className="lg:col-span-7">
          <CardHeader title="Active Jobs" subtitle={t("{n} running", { n: d.active.length })} action={<CardPlus href="/jobs" label="Open jobs" />} />
          <ul className="space-y-1 px-3 pb-6 md:px-6 md:pb-8">
            {d.active.map((j) => {
              const full = statusOf(j) === "filled";
              return (
                <li key={j.id}>
                  <Link href={jobHref(j.id)} className="flex items-center gap-4 rounded-2xl px-3 py-3 transition-colors hover:bg-canvas">
                    <SkillIcon skill={j.skill} size={52} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="truncate text-[17px] text-ink">{t(j.title)}</span>
                        <span className={`shrink-0 text-[15px] tabular-nums ${full ? "text-ok-fg" : "text-ink"}`}>{filled(j.id)}/{j.needed} · {full ? t("Filled") : t("Hiring")}</span>
                      </div>
                      <div className="truncate text-sm text-ink-mute">{t(j.area)} · {rateLabel(j)}</div>
                      <ProgressBar value={filled(j.id)} max={j.needed} className="mt-2.5" />
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>

        <Card className="lg:col-span-5">
          <CardHeader title="Live attendance" subtitle={`${formatDate(TODAY)} · ${fmtClock(now)}`} action={<CardPlus href="/live" label="Open Live Site" />} />
          <div className="flex flex-wrap items-center gap-6 px-6 pb-8 md:px-8">
            <Donut
              center={String(onSiteNow)} caption="on site now"
              slices={[
                { label: "on site", value: d.onSite.P, color: "#1C9A63" }, { label: "finished", value: d.onSite.H, color: "#3B82C4" },
                { label: "on the way", value: d.onSite.A, color: "#F2A93B" }, { label: "not started", value: d.onSite.unmarked, color: "#D9D2CA" },
              ]}
            />
            <dl className="grid min-w-[150px] flex-1 gap-3 text-[15px]">
              {([["On site", d.onSite.P, "#1C9A63"], ["Finished", d.onSite.H, "#3B82C4"], ["On the way", d.onSite.A, "#F2A93B"], ["Not started", d.onSite.unmarked, "#D9D2CA"]] as const).map(([l, n, c]) => (
                <div key={l} className="flex items-center justify-between gap-2">
                  <dt className="flex items-center gap-2 text-ink-soft"><span style={{ background: c }} className="h-2.5 w-2.5 rounded-full" />{t(l)}</dt>
                  <dd className="tabular-nums text-ink">{n}</dd>
                </div>
              ))}
            </dl>
          </div>
        </Card>
      </div>
    </div>
  );
}


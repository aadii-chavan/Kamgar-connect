"use client";
import { ArrowRight, Briefcase, CalendarDays, CheckCircle2, ChevronRight, Star, Wallet, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useMemo } from "react";
import { contractorOf, currentWorkerId, CITY } from "@/data/jobs";
import type { AttendanceMark, Job } from "@/data/types";
import { workerById } from "@/data/workers";
import { OverviewChart } from "@/components/dashboard/OverviewChart";
import { Scheduler } from "@/components/dashboard/Scheduler";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardPlus } from "@/components/ui/Card";
import { ApplicationChip, Chip, PayChip } from "@/components/ui/Chip";
import { Money } from "@/components/ui/Money";
import { StatCard } from "@/components/ui/PageHeader";
import { SkillIcon } from "@/components/ui/SkillIcon";
import { cn } from "@/components/ui/cn";
import { TODAY, addDays, formatDate, formatMonth, formatShort, rateLabel, weekday, yrs } from "@/lib/format";
import { tn, useT } from "@/lib/i18n";
import { earningsSeries, type Range } from "@/lib/series";
import { earnedFor, useStore } from "@/lib/store";
import { isLive, useApply } from "@/lib/worker";
import { useNow } from "@/lib/live";
import { ShiftChip } from "@/components/live/ShiftParts";
import { ProgressRing } from "@/components/worker/ProgressRing";
import { RateContractorsCard } from "@/components/worker/WorkerReviews";
import { TrustChip, VerifyBadges } from "@/components/worker/TrustParts";
import { checklist, levelOf, scoreOf, trustFor } from "@/lib/trust";

const MARK_STYLE: Record<AttendanceMark | "none", string> = {
  P: "bg-ok-bg text-ok-fg", H: "bg-warn-bg text-warn-fg", A: "bg-bad-bg text-bad-fg", none: "border border-dashed border-line text-ink-mute",
};

function Trend({ tone, children }: { tone: "good" | "bad" | "plain"; children: React.ReactNode }) {
  const cls = tone === "good" ? "text-ok-fg" : tone === "bad" ? "text-bad-fg" : "text-ink-soft";
  return <span className={cls}><span aria-hidden>↗</span> {children}</span>;
}

export default function WorkerDashboardPage() {
  const t = useT();
  const { apply, withdraw } = useApply();
  const { jobs, applications, payroll, getMark, filled, statusOf, profile, shiftOf } = useStore();
  const now = useNow(3000);
  const me = workerById(currentWorkerId);

  const d = useMemo(() => {
    const mine = applications.filter((a) => a.workerId === me.id);
    const acceptedJobs = mine.filter((a) => a.status === "accepted").map((a) => jobs.find((j) => j.id === a.jobId)).filter((j): j is Job => !!j);
    const active = acceptedJobs.filter((j) => isLive(j) && j.startDate <= TODAY);
    const monthStart = `${TODAY.slice(0, 7)}-01`;
    const counts = { P: 0, H: 0, A: 0 };
    for (const j of acceptedJobs) {
      for (let day = j.startDate > monthStart ? j.startDate : monthStart; day <= TODAY && day <= j.endDate; day = addDays(day, 1)) {
        const m = getMark(j, me.id, day);
        if (m) counts[m] += 1;
      }
    }
    // What the worker earned on each day of the past year, from approved attendance.
    const earnedByDay: Record<string, number> = {};
    for (let i = 0; i < 365; i++) {
      const date = addDays(TODAY, -i);
      for (const j of acceptedJobs) {
        const m = getMark(j, me.id, date);
        if (m === "P" || m === "H") earnedByDay[date] = (earnedByDay[date] ?? 0) + earnedFor(j, m === "P" ? 1 : 0.5);
      }
    }
    const rows = payroll.filter((r) => r.workerId === me.id);
    const order = { overdue: 0, pending: 1, paid: 2 } as const;
    rows.sort((a, b) => order[a.status] - order[b.status]);
    const openForMe = jobs.filter((j) => isLive(j) && !mine.some((a) => a.jobId === j.id) && statusOf(j) !== "filled")
      .sort((a, b) => Number(b.skill === me.skill) - Number(a.skill === me.skill) || a.startDate.localeCompare(b.startDate));
    const scheduleJobs = mine.filter((a) => a.status !== "rejected").map((a) => jobs.find((j) => j.id === a.jobId)).filter((j): j is Job => !!j);
    return {
      mine, active, counts, earnedByDay, rows, openForMe, scheduleJobs,
      days: counts.P + counts.H * 0.5,
      earnedMonth: Object.entries(earnedByDay).filter(([date]) => date >= monthStart).reduce((s, [, v]) => s + v, 0),
      dueFrom: [...new Set(rows.filter((r) => r.status !== "paid").map((r) => r.job.contractorId))].map((id) => contractorOf(id).company),
      toReceive: rows.filter((r) => r.status !== "paid").reduce((s, r) => s + r.amount, 0),
      pendingApps: mine.filter((a) => a.status === "pending").length,
    };
  }, [applications, jobs, payroll, getMark, statusOf, me.id, me.skill]);

  const trustScore = scoreOf(profile);
  const trust = trustFor(currentWorkerId, profile, currentWorkerId);
  const nextStep = checklist(profile).filter((i) => !i.done).sort((x, y) => (y.points - y.earned) - (x.points - x.earned))[0];
  const getSeries = useCallback((r: Range) => earningsSeries(r, d.earnedByDay), [d.earnedByDay]);


  const cur = d.active[0];
  const todayShift = cur ? shiftOf(cur, me.id) : undefined;
  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(TODAY, i - 6));
  const markLabel = { P: "Present", H: "Half day", A: "Absent" } as const;

  return (
    <div>
      {/* Hero */}
      <section className="on-dark relative pt-4 md:pt-10">
        <div className="grid items-start gap-10 grid-cols-1 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <p className="text-lg text-white/85">{t("Find work, track your attendance and get paid on time")}</p>
            <h1 className="mt-6 text-[46px] font-medium leading-[1] tracking-[-0.04em] text-white md:mt-10 md:text-[84px]">
              {t("Welcome Back, {name}!", { name: t(me.name.split(" ")[0]) })}
            </h1>
            <div className="mt-8 flex flex-wrap gap-3 md:mt-12">
              {cur && <Button variant="light" href="/worker/today" icon={<ArrowRight size={18} />} className="min-w-[220px] !min-h-14 flex-row-reverse">{t("Today's work")}</Button>}
              <Button variant="light" href="/worker/jobs" className="min-w-[220px] !min-h-14">{t("Find Jobs")}</Button>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[540px] pt-10 text-white lg:col-span-5 lg:-mb-28 lg:ml-auto lg:mr-0">
            <span aria-hidden className="glass absolute inset-x-12 top-0 h-24 rounded-t-3xl opacity-50" />
            <span aria-hidden className="glass absolute inset-x-6 top-5 h-24 rounded-t-3xl opacity-75" />
            <div className="glass relative rounded-3xl bg-white/20 p-7 text-center md:p-9">
              <div className="flex items-center justify-between text-[17px] tabular-nums text-white/90">
                <span className="flex items-center gap-5">
                  <span>•••• {cur ? cur.id.replace("J-", "") : "----"}</span>
                  <span>{cur ? `${formatShort(cur.startDate)} – ${formatShort(cur.endDate)}` : t("No active job")}</span>
                </span>
                <span className="text-[26px] font-bold italic tracking-tight text-white/60">KAMGAR</span>
              </div>
              <div className="mt-2 text-sm text-white/80">{t("Pending to receive")}</div>
              <div className="mt-2 text-[48px] font-medium leading-none tracking-tight md:text-[60px]"><Money value={d.toReceive} /></div>
              <span className="glass mx-auto mt-6 inline-flex items-center gap-2 rounded-full px-5 py-2 text-[15px] text-white/90">
                <span aria-hidden>↗</span>{tn(t, d.days, "{n} day worked this month", "{n} days worked this month")}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Earnings + tiles */}
      <div className="relative z-10 mt-10 grid gap-5 lg:mt-12 grid-cols-1 lg:grid-cols-12">
        <Card className="lg:col-span-7">
          <OverviewChart title="Earnings overview" getSeries={getSeries} captions={{ year: "Earned in the last 12 months", month: "Earned in the last 30 days", week: "Earned in the last 7 days" }} />
        </Card>
        <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:col-span-5">
          <StatCard label="Active Jobs" icon={<Briefcase size={22} strokeWidth={1.6} />} value={d.active.length}
            hint={<Trend tone="plain">{tn(t, d.pendingApps, "{n} application pending", "{n} applications pending")}</Trend>} />
          <StatCard label="Days Worked" icon={<CalendarDays size={22} strokeWidth={1.6} />} value={d.days}
            hint={<Trend tone="good">{t("This month")}</Trend>} />
          <StatCard label="Earned This Month" icon={<Wallet size={22} strokeWidth={1.6} />} value={<Money value={d.earnedMonth} />}
            hint={<Trend tone="good">{cur ? rateLabel(cur) : t("No active job")}</Trend>} />
          <StatCard label="Pending Pay" icon={<CheckCircle2 size={22} strokeWidth={1.6} />} value={<Money value={d.toReceive} />}
            hint={<Trend tone="plain">{d.dueFrom.length === 0 ? t("You are all paid up") : d.dueFrom.length === 1 ? t("Due from {name}", { name: t(d.dueFrom[0]) }) : t("Due from {n} contractors", { n: d.dueFrom.length })}</Trend>} />
        </div>
      </div>

      {/* Attendance + profile */}
      <div className="mt-5 grid gap-5 grid-cols-1 lg:grid-cols-12">
        <Card className="lg:col-span-7">
          <CardHeader title="My Attendance" subtitle={formatDate(TODAY)} />
          {cur ? (
            <div className="px-6 pb-6 md:px-8 md:pb-8">
              <div className="flex flex-wrap items-center gap-4 rounded-2xl bg-canvas p-4">
                <SkillIcon skill={cur.skill} size={52} />
                <div className="min-w-0 flex-1 basis-40">
                  <div className="truncate text-lg text-ink">{t(cur.title)}</div>
                  <div className="truncate text-sm text-ink-mute">{t(cur.area)} · {rateLabel(cur)}</div>
                </div>
                {todayShift && <Link href="/worker/today" className="flex items-center gap-2"><ShiftChip status={todayShift.status} /><ChevronRight size={16} className="text-ink-mute" /></Link>}
              </div>
              <ul className="mt-6 grid grid-cols-7 gap-2 text-center" aria-label={t("Last 7 days")}>
                {weekDates.map((day) => {
                  const m = getMark(cur, me.id, day);
                  const inRange = day >= cur.startDate && day <= cur.endDate;
                  return (
                    <li key={day} className="flex flex-col items-center gap-2">
                      <span className={cn("text-xs text-ink-mute", day === TODAY && "font-medium text-ink")}>{weekday(day)}</span>
                      <span
                        aria-label={`${formatShort(day)}: ${m ? t(markLabel[m]) : t("Unmarked")}`}
                        className={cn("flex h-11 w-11 items-center justify-center rounded-full text-sm font-medium sm:h-12 sm:w-12", inRange ? MARK_STYLE[m ?? "none"] : "text-ink-mute/50")}
                      >{inRange ? (m ? t(m) : "·") : "–"}</span>
                      <span className="text-xs tabular-nums text-ink-mute">{day.slice(8).replace(/^0/, "")}</span>
                    </li>
                  );
                })}
              </ul>
              <dl className="mt-6 grid grid-cols-3 gap-3 border-t border-line pt-5 text-center">
                {([["Present", d.counts.P, "text-ok-fg"], ["Half day", d.counts.H, "text-warn-fg"], ["Absent", d.counts.A, "text-bad-fg"]] as const).map(([l, n, c]) => (
                  <div key={l}><dd className={cn("text-3xl tabular-nums", c)}>{n}</dd><dt className="text-sm text-ink-mute">{t(l)} · {t("This month")}</dt></div>
                ))}
              </dl>
            </div>
          ) : (
            <div className="px-6 pb-8 text-center md:px-8">
              <p className="text-ink-soft">{t("You have no active job right now.")}</p>
              <Button variant="primary" href="/worker/jobs" className="mt-4">{t("Find Jobs")}</Button>
            </div>
          )}
        </Card>

        <Card className="lg:col-span-5">
          <CardHeader title="My Profile" action={<CardPlus href="/worker/profile" label="Open profile" />} />
          <div className="px-6 pb-6 md:px-8 md:pb-8">
            <div className="flex items-center gap-5">
              <ProgressRing value={trustScore} size={112} label={t("Profile strength")} />
              <div className="min-w-0">
                <div className="truncate text-[22px] text-ink">{t(me.name)}</div>
                <div className="mt-1 text-sm text-ink-mute">{t(me.skill)} · {t(me.area)}, {t(CITY)}</div>
                <div className="mt-2"><TrustChip level={levelOf(trustScore)} /></div>
              </div>
            </div>
            <VerifyBadges trust={trust} className="mt-5" />
            <dl className="mt-5 grid grid-cols-3 gap-3 text-center">
              <div className="rounded-2xl bg-canvas p-3"><dd className="flex items-center justify-center gap-1 text-2xl tabular-nums"><Star size={18} className="fill-[#F2A93B] text-[#F2A93B]" />{me.rating.toFixed(1)}</dd><dt className="text-xs text-ink-mute">{t("Rating")}</dt></div>
              <div className="rounded-2xl bg-canvas p-3"><dd className="text-2xl tabular-nums">{yrs(me.experience)}</dd><dt className="text-xs text-ink-mute">{t("Experience")}</dt></div>
              <div className="rounded-2xl bg-canvas p-3"><dd className="text-2xl tabular-nums">{me.completedJobs}</dd><dt className="text-xs text-ink-mute">{t("Jobs completed")}</dt></div>
            </dl>
            {nextStep && (
              <Button variant="primary" href="/worker/profile" className="mt-5 w-full" icon={<ArrowRight size={18} />}>{t(nextStep.label)} · +{nextStep.points - nextStep.earned}</Button>
            )}
          </div>
        </Card>
      </div>

      {/* Open jobs + payments */}
      <div className="mt-5 grid gap-5 grid-cols-1 lg:grid-cols-12">
        <Card className="lg:col-span-7">
          <CardHeader title="Jobs Near You" subtitle="Matching your skill first" action={<CardPlus href="/worker/jobs" label="Open jobs" />} />
          <ul className="space-y-3 px-4 pb-6 md:px-8 md:pb-8">
            {d.openForMe.slice(0, 3).map((j) => (
              <li key={j.id} className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-2xl bg-canvas p-3 md:p-4">
                <SkillIcon skill={j.skill} size={52} />
                <div className="min-w-0 flex-1 basis-44">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-lg text-ink">{t(j.title)}</span>
                    {j.skill === me.skill && <Chip tone="green">{t("Skill match")}</Chip>}
                  </div>
                  <div className="truncate text-sm text-ink-mute tabular-nums">{t(j.area)} · {rateLabel(j)} · {formatShort(j.startDate)} – {formatShort(j.endDate)}</div>
                </div>
                <Button size="sm" variant="primary" onClick={() => apply(j)}>{t("Apply")}</Button>
              </li>
            ))}
            {d.openForMe.length === 0 && <li className="py-6 text-center text-sm text-ink-mute">{t("No new jobs right now. Check back soon.")}</li>}
          </ul>
        </Card>

        <Card className="lg:col-span-5">
          <CardHeader title="My Payments" subtitle={tn(t, d.rows.length, "{n} payment", "{n} payments")} />
          <ul className="space-y-3 px-4 pb-6 md:px-6 md:pb-8">
            {d.rows.map((r) => (
              <li key={r.key} className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl bg-canvas p-3">
                <SkillIcon skill={r.job.skill} size={44} />
                <div className="min-w-0 flex-1 basis-32">
                  <div className="truncate text-[16px] text-ink">{t(r.job.title)}</div>
                  <div className="text-xs text-ink-mute">{tn(t, r.days, "{n} day", "{n} days")} · {rateLabel(r.job)}</div>
                </div>
                <PayChip status={r.status} />
                <span className={cn("text-lg tabular-nums", r.status === "paid" ? "text-ok-fg" : "text-ink")}>{r.status === "paid" ? "+" : ""}₹{r.amount.toLocaleString("en-IN")}</span>
              </li>
            ))}
            {d.rows.length === 0 && <li className="py-6 text-center text-sm text-ink-mute">{t("No payments yet")}</li>}
          </ul>
        </Card>
      </div>

      {/* Applications + schedule */}
      <div className="mt-5 grid gap-5 grid-cols-1 lg:grid-cols-12">
        <Card className="lg:col-span-7">
          <CardHeader title="My Applications" subtitle={t("{n} pending", { n: d.pendingApps })} action={<CardPlus href="/worker/applications" label="Open applications" />} />
          <ul className="space-y-1 px-3 pb-6 md:px-6 md:pb-8">
            {[...d.mine].sort((a, b) => b.appliedOn.localeCompare(a.appliedOn)).slice(0, 4).map((a) => {
              const j = jobs.find((x) => x.id === a.jobId)!;
              return (
                <li key={a.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl px-3 py-3 hover:bg-canvas">
                  <SkillIcon skill={j.skill} size={48} />
                  <div className="min-w-0 flex-1 basis-40">
                    <div className="truncate text-[17px] text-ink">{t(j.title)}</div>
                    <div className="truncate text-sm text-ink-mute">{t(j.area)} · {t("Applied {date}", { date: formatShort(a.appliedOn) })}</div>
                  </div>
                  <ApplicationChip status={a.status} />
                  {a.status === "pending" && (
                    <button onClick={() => withdraw(a)} aria-label={t("Withdraw")} className="flex h-11 w-11 items-center justify-center rounded-full bg-canvas text-ink hover:bg-accent-tint"><X size={18} /></button>
                  )}
                </li>
              );
            })}
            {d.mine.length === 0 && (
              <li className="py-6 text-center text-sm text-ink-mute">
                {t("Jobs you apply for will show up here.")}{" "}
                <Link href="/worker/jobs" className="inline-flex items-center text-ink underline">{t("Find Jobs")}<ChevronRight size={14} /></Link>
              </li>
            )}
          </ul>
        </Card>

        <Card className="lg:col-span-5">
          <CardHeader title="My Schedule" subtitle={formatMonth(TODAY.slice(0, 7))} />
          <Scheduler jobs={d.scheduleJobs} />
        </Card>
      </div>

      <div className="mt-5"><RateContractorsCard /></div>
    </div>
  );
}


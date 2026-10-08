"use client";
import { Wallet } from "lucide-react";
import { workerHref } from "@/lib/links";
import { useMemo, useState } from "react";
import type { ApplicationStatus, AttendanceMark, Job } from "@/data/types";
import { workerById } from "@/data/workers";
import { TODAY, addDays, daysInclusive, formatDate, formatINR, formatShort, rateLabel, weekday, yrs } from "@/lib/format";
import { useT, tn } from "@/lib/i18n";
import { estimateTotal, jobDays, useStore, type PayrollRow } from "@/lib/store";
import { ApplicantActions, ApplicantDrawer, WorkerCell } from "../shared/ApplicantParts";
import { MarkPaidModal } from "../shared/MarkPaidModal";
import { RatingCell, TrustPill } from "../worker/TrustParts";
import { ReviewCard } from "../reviews/ReviewCard";
import { ReviewModal, type ReviewCtx } from "../reviews/ReviewModal";
import { Chip } from "../ui/Chip";
import { isRevealed, jobEnded, reviewState } from "@/lib/reviews";
import { Check, Lock, Star } from "lucide-react";
import { Button } from "../ui/Button";
import { Card, CardHeader } from "../ui/Card";
import { PayChip } from "../ui/Chip";
import { DataTable, type Column } from "../ui/DataTable";
import { EmptyState } from "../ui/EmptyState";
import { ProgressBar } from "../ui/ProgressBar";
import { Segmented } from "../ui/Segmented";
import { StatCard } from "../ui/PageHeader";
import { cn } from "../ui/cn";
import type { Application } from "@/data/types";

/* ---------------- Overview ---------------- */
export function OverviewTab({ job }: { job: Job }) {
  const { filled, acceptedWorkers, payroll } = useStore();
  const t = useT();
  const f = filled(job.id);
  const days = daysInclusive(job.startDate, job.endDate);
  const paid = payroll.filter((r) => r.job.id === job.id && r.status === "paid").reduce((s, r) => s + r.amount, 0);
  const owed = payroll.filter((r) => r.job.id === job.id && r.status !== "paid").reduce((s, r) => s + r.amount, 0);
  const rows: [string, string][] = [
    [t("Skill"), t(job.skill)], [t("Site address"), t(job.address)], [t("Pay"), rateLabel(job)],
    [t("Start date"), formatDate(job.startDate)], [t("End date"), formatDate(job.endDate)], [t("Duration"), tn(t, days, "{n} day", "{n} days")], [t("Posted on"), formatDate(job.postedOn)],
  ];
  return (
    <div className="grid gap-6 grid-cols-1 lg:grid-cols-5">
      <div className="space-y-6 lg:col-span-3">
        <Card>
          <CardHeader title="Staffing" />
          <div className="border-t border-line p-6">
            <div className="flex items-baseline justify-between"><span className="text-4xl font-medium tabular-nums">{f}<span className="text-ink-mute"> / {job.needed}</span></span><span className="text-sm text-ink-mute">{t("workers confirmed")}</span></div>
            <ProgressBar value={f} max={job.needed} className="mt-3" />
          </div>
        </Card>
        <Card>
          <CardHeader title="Job details" />
          <dl className="divide-y divide-line border-t border-line">
            {rows.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-6 px-6 py-3 text-sm"><dt className="text-ink-mute">{k}</dt><dd className="text-right font-medium tabular-nums">{v}</dd></div>
            ))}
          </dl>
        </Card>
      </div>
      <div className="space-y-6 lg:col-span-2">
        <div className="grid grid-cols-2 gap-4">
          <StatCard tone="blue" icon={<Wallet size={18} />} label="Estimated cost" value={formatINR(estimateTotal(job.payType, job.amount, job.needed, days))} />
          <StatCard tone="orange" icon={<Wallet size={18} />} label="Yet to pay" value={formatINR(owed)} hint={t("{amount} paid", { amount: formatINR(paid) })} />
        </div>
        <Card>
          <CardHeader title="Confirmed workers" />
          <ul className="divide-y divide-line border-t border-line">
            {acceptedWorkers(job.id).length === 0 && <li className="px-6 py-6 text-sm text-ink-mute">{t("No one accepted yet.")}</li>}
            {acceptedWorkers(job.id).map((w) => <li key={w} className="px-6 py-3"><WorkerCell workerId={w} href={workerHref(w)} /></li>)}
          </ul>
        </Card>
      </div>
    </div>
  );
}

/* ---------------- Applicants ---------------- */
export function ApplicantsTab({ job }: { job: Job }) {
  const { applications, filled } = useStore();
  const t = useT();
  const [filter, setFilter] = useState<"all" | ApplicationStatus>("all");
  const [open, setOpen] = useState<Application | null>(null);
  const all = applications.filter((a) => a.jobId === job.id);
  const rows = all.filter((a) => filter === "all" || a.status === filter);
  const f = filled(job.id);

  const columns: Column<Application>[] = [
    { key: "w", header: "Applicant", cell: (a) => <WorkerCell workerId={a.workerId} /> },
    { key: "exp", header: "Experience", cell: (a) => <span className="tabular-nums">{yrs(workerById(a.workerId).experience)}</span> },
    { key: "trust", header: "Trust", cell: (a) => <TrustPill workerId={a.workerId} /> },
    { key: "rating", header: "Rating", cell: (a) => <RatingCell workerId={a.workerId} /> },
    { key: "on", header: "Applied", cell: (a) => <span className="tabular-nums">{formatShort(a.appliedOn)}</span> },
    { key: "act", header: "", align: "right", cell: (a) => <ApplicantActions app={a} /> },
  ];

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">{f >= job.needed ? t("All positions filled") : tn(t, job.needed - f, "{n} more worker needed", "{n} more workers needed")}</span>
          <span className="font-medium tabular-nums">{f}/{job.needed}</span>
        </div>
        <ProgressBar value={f} max={job.needed} className="mt-3" />
      </Card>
      <Card>
        <div className="p-4 md:px-6">
          <Segmented<"all" | ApplicationStatus> label="Filter applicants" value={filter} onChange={setFilter} options={[
            { id: "all", label: t("All {n}", { n: all.length }) }, { id: "pending", label: "Pending" }, { id: "accepted", label: "Accepted" }, { id: "rejected", label: "Rejected" },
          ]} />
        </div>
        <div className="border-t border-line">
          <DataTable caption="Applicants" columns={columns} rows={rows} rowKey={(a) => a.id} onRowClick={setOpen}
            empty={<EmptyState icon={<Wallet size={22} />} title="No applicants here" body="New applications will show up as workers find this job." />} />
        </div>
      </Card>
      <ApplicantDrawer app={open} onClose={() => setOpen(null)} />
    </div>
  );
}

/* ---------------- Attendance ---------------- */
const MARK_STYLE: Record<AttendanceMark | "none", string> = {
  P: "bg-ok-bg text-ok-fg", H: "bg-warn-bg text-warn-fg", A: "bg-bad-bg text-bad-fg", none: "border border-dashed border-line text-ink-mute",
};
const NEXT: Record<AttendanceMark | "none", AttendanceMark | "none"> = { none: "P", P: "H", H: "A", A: "none" };

export function AttendanceTab({ job }: { job: Job }) {
  const { acceptedWorkers, getMark, setMark } = useStore();
  const t = useT();
  const workers = acceptedWorkers(job.id);
  const dates = useMemo(() => {
    const end = job.endDate < TODAY ? job.endDate : TODAY;
    return Array.from({ length: 7 }, (_, i) => addDays(end, i - 6));
  }, [job]);

  if (workers.length === 0) return <Card><EmptyState icon={<Wallet size={22} />} title="No workers yet" body="Accept applicants to start tracking attendance." /></Card>;
  const live = (d: string) => d >= job.startDate && d <= job.endDate && d <= TODAY;

  return (
    <Card>
      <CardHeader title="Last 7 days" subtitle="Tap a cell to cycle Present → Half day → Absent → Unmarked" />
      <div className="overflow-x-auto border-t border-line">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="text-xs text-ink-mute">
              <th scope="col" className="sticky left-0 bg-white px-6 py-3 text-left font-medium">{t("Worker")}</th>
              {dates.map((d) => (
                <th key={d} scope="col" className={cn("px-1 py-3 text-center font-medium", d === TODAY && "text-accent")}>
                  <div>{weekday(d)}</div><div className="tabular-nums">{formatShort(d)}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {workers.map((w) => (
              <tr key={w}>
                <th scope="row" className="sticky left-0 bg-white px-6 py-2 text-left font-normal"><WorkerCell workerId={w} /></th>
                {dates.map((d) => {
                  const m = getMark(job, w, d);
                  const key = m ?? "none";
                  return (
                    <td key={d} className="px-1 py-2 text-center">
                      {live(d) ? (
                        <button
                          onClick={() => setMark(job, w, d, NEXT[key])}
                          aria-label={`${t(workerById(w).name)}, ${formatShort(d)}: ${t(m ? { P: "present", H: "half day", A: "absent" }[m] : "unmarked")}`}
                          className={cn("mx-auto flex h-11 w-11 items-center justify-center rounded-xl text-sm font-medium transition-colors hover:brightness-95", MARK_STYLE[key])}
                        >{m ? t(m) : "·"}</button>
                      ) : <span className="text-ink-mute/50">–</span>}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap gap-4 border-t border-line px-6 py-4 text-xs text-ink-soft">
        <span><b className="text-ok-fg">{t("P")}</b> {t("Present")}</span><span><b className="text-warn-fg">{t("H")}</b> {t("Half day")}</span><span><b className="text-bad-fg">{t("A")}</b> {t("Absent")}</span><span>· {t("Unmarked")}</span>
      </div>
    </Card>
  );
}

/* ---------------- Payments ---------------- */
export function PaymentsTab({ job }: { job: Job }) {
  const { payroll } = useStore();
  const t = useT();
  const [paying, setPaying] = useState<PayrollRow[]>([]);
  const rows = payroll.filter((r) => r.job.id === job.id);
  const unpaid = rows.filter((r) => r.status !== "paid");

  const columns: Column<PayrollRow>[] = [
    { key: "w", header: "Worker", cell: (r) => <WorkerCell workerId={r.workerId} sub={t(job.skill)} /> },
    { key: "days", header: "Days worked", cell: (r) => <span className="tabular-nums">{r.days}</span> },
    { key: "rate", header: "Rate", cell: () => <span className="tabular-nums">{rateLabel(job)}</span> },
    { key: "amt", header: "Amount", align: "right", cell: (r) => <span className="font-medium tabular-nums">{formatINR(r.amount)}</span> },
    { key: "st", header: "Status", cell: (r) => <PayChip status={r.status} /> },
    { key: "act", header: "", align: "right", cell: (r) => r.status === "paid" ? <span className="text-xs text-ink-mute">{t(r.mode!)} · {formatShort(r.paidOn!)}</span> : <Button size="sm" onClick={() => setPaying([r])}>{t("Mark as Paid")}</Button> },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <StatCard tone="orange" icon={<Wallet size={18} />} label="Yet to pay" value={formatINR(unpaid.reduce((s, r) => s + r.amount, 0))} hint={tn(t, unpaid.length, "{n} worker", "{n} workers")} />
        <StatCard tone="green" icon={<Wallet size={18} />} label="Paid so far" value={formatINR(rows.filter((r) => r.status === "paid").reduce((s, r) => s + r.amount, 0))} />
      </div>
      <Card>
        <CardHeader title="Worker payments" subtitle={`${tn(t, jobDays(job), "{n} day elapsed", "{n} days elapsed")} · ${rateLabel(job)}`} action={unpaid.length > 1 ? <Button variant="primary" size="sm" onClick={() => setPaying(unpaid)}>{t("Mark all as Paid")}</Button> : undefined} />
        <div className="border-t border-line">
          <DataTable caption="Payments" columns={columns} rows={rows} rowKey={(r) => r.key}
            empty={<EmptyState icon={<Wallet size={22} />} title="Nothing to pay yet" body="Payments appear once accepted workers have attendance." />} />
        </div>
      </Card>
      <MarkPaidModal rows={paying} onClose={() => setPaying([])} />
    </div>
  );
}

/* ---------------- Reviews ---------------- */
export function ReviewsTab({ job }: { job: Job }) {
  const t = useT();
  const { acceptedWorkers, applications, reviews } = useStore();
  const [ctx, setCtx] = useState<ReviewCtx | null>(null);
  const workers = acceptedWorkers(job.id);
  const ended = jobEnded(job);
  const aboutJob = reviews.filter((r) => r.jobId === job.id && r.by === "worker" && isRevealed(reviews, job, r.jobId, r.workerId));

  return (
    <div className="space-y-5">
      <Card className="p-6 md:p-8">
        <h2 className="text-[22px] font-normal tracking-tight text-ink-soft">{t("Rate your team")}</h2>
        <p className="mt-1 text-sm text-ink-mute">
          {ended ? t("Rate each worker honestly. Their review of you stays hidden until you have both submitted, or 45 days after the job ends.") : t("Reviews open when the job ends or you close it.")}
        </p>
      </Card>
      <Card>
        <ul className="divide-y divide-line">
          {workers.length === 0 && <li className="px-6 py-8 text-center text-sm text-ink-mute">{t("No workers to review yet.")}</li>}
          {workers.map((w) => {
            const rs = reviewState(job, w, "contractor", applications, reviews);
            const revealed = isRevealed(reviews, job, job.id, w);
            const theirs = reviews.find((r) => r.jobId === job.id && r.workerId === w && r.by === "worker");
            return (
              <li key={w} className="flex flex-wrap items-center gap-x-4 gap-y-3 px-6 py-4">
                <div className="min-w-0 flex-1 basis-56"><WorkerCell workerId={w} href={workerHref(w)} /></div>
                {theirs && !revealed && rs.state !== "done" && <Chip tone="amber"><Lock size={12} className="mr-0.5 inline" />{t("They reviewed you. Submit yours to see it")}</Chip>}
                {rs.state === "open" && <Button size="sm" variant="primary" icon={<Star size={16} />} onClick={() => setCtx({ job, workerId: w, by: "contractor" })}>{t("Write a review")}</Button>}
                {rs.state === "done" && (revealed
                  ? <Chip tone="green"><Check size={12} className="mr-0.5 inline" />{t("You reviewed")} · {rs.review.rating}/5</Chip>
                  : <Chip tone="amber"><Lock size={12} className="mr-0.5 inline" />{t("Submitted. Hidden until they review too")}</Chip>)}
                {rs.state === "locked" && <Chip tone="slate">{t("Reviews open when the job ends")}</Chip>}
              </li>
            );
          })}
        </ul>
      </Card>
      {aboutJob.length > 0 && (
        <Card>
          <CardHeader title="What workers said about this job" />
          <div className="space-y-3 px-4 pb-6 md:px-8 md:pb-8">{aboutJob.map((r) => <ReviewCard key={r.id} review={r} />)}</div>
        </Card>
      )}
      <ReviewModal ctx={ctx} onClose={() => setCtx(null)} />
    </div>
  );
}

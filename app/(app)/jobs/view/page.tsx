"use client";
import { ArrowLeft, Briefcase, CalendarDays, MapPin, Users, Wallet, BadgeIndianRupee } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useT } from "@/lib/i18n";
import { estimateTotal, useStore } from "@/lib/store";
import { daysInclusive, formatDate, formatINR, rateLabel } from "@/lib/format";
import { SkillIcon } from "@/components/ui/SkillIcon";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/PageHeader";
import { JobStatusChip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { Tabs } from "@/components/ui/Tabs";
import { useToast } from "@/components/ui/Toast";
import { AttendanceTab, OverviewTab, PaymentsTab, ApplicantsTab, ReviewsTab } from "@/components/job/JobTabs";
import { jobEnded, pendingReviews } from "@/lib/reviews";
import { LifecycleStepper, type Step } from "@/components/live/LifecycleStepper";
import { TODAY } from "@/lib/format";

type Tab = "overview" | "applicants" | "attendance" | "payments" | "reviews";
const TABS: Tab[] = ["overview", "applicants", "attendance", "payments", "reviews"];

function JobDetail() {
  const query = useSearchParams();
  const id = query.get("id") ?? "";
  const initial = query.get("tab") as Tab | null;
  const [tab, setTab] = useState<Tab>(initial && TABS.includes(initial) ? initial : "overview");
  const toast = useToast();
  const t = useT();
  const { jobs, applications, statusOf, closeJob, filled, reviews, payroll, acceptedWorkers } = useStore();
  const job = jobs.find((j) => j.id === id);

  if (!job) {
    return <EmptyState icon={<Briefcase size={22} />} title="Job not found" body="It may have been removed." action={<Button variant="primary" href="/jobs">{t("Back to Jobs")}</Button>} />;
  }

  const status = statusOf(job);
  const pending = applications.filter((a) => a.jobId === job.id && a.status === "pending").length;

  // Where the job stands, from posting to reviews.
  const ws = acceptedWorkers(job.id);
  const payRows = payroll.filter((r) => r.job.id === job.id);
  const flags = [
    true,
    filled(job.id) >= job.needed || jobEnded(job),
    ws.length > 0 && job.startDate <= TODAY,
    jobEnded(job),
    payRows.length > 0 && payRows.every((r) => r.status === "paid"),
    ws.length > 0 && ws.every((w) => (["contractor", "worker"] as const).every((by) => reviews.some((r) => r.jobId === job.id && r.workerId === w && r.by === by))),
  ];
  const firstOpen = flags.findIndex((f) => !f);
  const lifecycle: Step[] = ["Posted", "Team hired", "In progress", "Completed", "Paid", "Reviewed"].map((label, i) => ({
    label, state: firstOpen === -1 || i < firstOpen ? "done" : i === firstOpen ? "current" : "todo",
    hint: i === 1 ? `${filled(job.id)}/${job.needed}` : undefined,
  }));

  const facts = [
    { icon: BadgeIndianRupee, label: t("Pay"), value: rateLabel(job) },
    { icon: CalendarDays, label: t("Dates"), value: `${formatDate(job.startDate)} – ${formatDate(job.endDate)}` },
    { icon: Users, label: t("Workers"), value: t("{v} of {m} filled", { v: filled(job.id), m: job.needed }) },
    { icon: Wallet, label: t("Est. cost"), value: formatINR(estimateTotal(job.payType, job.amount, job.needed, daysInclusive(job.startDate, job.endDate))) },
  ];

  return (
    <div>
      <Link href="/jobs" className="mb-4 on-dark inline-flex min-h-11 items-center gap-2 text-[15px] text-white/85 hover:text-white"><ArrowLeft size={16} />{t("All jobs")}</Link>
      <Card className="mb-6 p-6 md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-5">
            <SkillIcon skill={job.skill} size={68} />
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-[26px] font-normal leading-tight md:text-[30px]">{t(job.title)}</h1>
                <JobStatusChip status={status} />
              </div>
              <p className="mt-1 flex items-center gap-2 text-sm text-ink-mute"><MapPin size={14} />{t(job.address)}</p>
            </div>
          </div>
          {status !== "closed" && (
            <Button onClick={() => { closeJob(job.id); toast(t("{job} closed", { job: t(job.title) })); }}>{t("Close job")}</Button>
          )}
        </div>
        <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-line pt-6 lg:grid-cols-4">
          {facts.map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center gap-3">
              <Badge tone="green" size={46}><Icon size={19} /></Badge>
              <div className="min-w-0">
                <dt className="text-xs text-ink-mute">{label}</dt>
                <dd className="truncate text-[15px] tabular-nums">{value}</dd>
              </div>
            </div>
          ))}
        </dl>
        <LifecycleStepper steps={lifecycle} label="Job lifecycle" className="mt-6 border-t border-line pt-6" />
      </Card>

      <Tabs<Tab> variant="pill" label="Job sections" value={tab} onChange={setTab} items={[
        { id: "overview", label: "Overview" }, { id: "applicants", label: "Applicants", count: pending || undefined },
        { id: "attendance", label: "Attendance" }, { id: "payments", label: "Payments" },
        { id: "reviews", label: "Reviews", count: pendingReviews("contractor", [job], applications, reviews).length || undefined },
      ]} />
      <div className="mt-6">
        {tab === "overview" && <OverviewTab job={job} />}
        {tab === "applicants" && <ApplicantsTab job={job} />}
        {tab === "attendance" && <AttendanceTab job={job} />}
        {tab === "payments" && <PaymentsTab job={job} />}
        {tab === "reviews" && <ReviewsTab job={job} />}
      </div>
    </div>
  );
}

export default function JobDetailPage() {
  return <Suspense><JobDetail /></Suspense>;
}

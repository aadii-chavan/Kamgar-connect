"use client";
import { FileText } from "lucide-react";
import { useMemo, useState } from "react";
import { currentWorkerId } from "@/data/jobs";
import type { Application, ApplicationStatus } from "@/data/types";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ApplicationChip } from "@/components/ui/Chip";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader, StatCard } from "@/components/ui/PageHeader";
import { SkillIcon } from "@/components/ui/SkillIcon";
import { Tabs } from "@/components/ui/Tabs";
import { formatDate, formatShort, rateLabel } from "@/lib/format";
import { useT } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import { useApply } from "@/lib/worker";
import { CheckCircle2, Clock, XCircle } from "lucide-react";

type F = "all" | ApplicationStatus;

export default function WorkerApplicationsPage() {
  const t = useT();
  const { applications, jobs } = useStore();
  const { withdraw } = useApply();
  const [f, setF] = useState<F>("all");

  const mine = useMemo(() => applications.filter((a) => a.workerId === currentWorkerId).sort((a, b) => b.appliedOn.localeCompare(a.appliedOn)), [applications]);
  const rows = mine.filter((a) => f === "all" || a.status === f);
  const count = (s: ApplicationStatus) => mine.filter((a) => a.status === s).length;
  const jobOf = (a: Application) => jobs.find((j) => j.id === a.jobId)!;

  const columns: Column<Application>[] = [
    { key: "job", header: "Job", cell: (a) => (
      <span className="flex items-center gap-3"><SkillIcon skill={jobOf(a).skill} size={40} /><span><span className="block font-medium">{t(jobOf(a).title)}</span><span className="text-xs font-normal text-ink-mute">{t(jobOf(a).area)}</span></span></span>
    ) },
    { key: "pay", header: "Pay", cell: (a) => <span className="tabular-nums">{rateLabel(jobOf(a))}</span> },
    { key: "dates", header: "Dates", cell: (a) => <span className="whitespace-nowrap tabular-nums text-ink-soft">{formatDate(jobOf(a).startDate)} – {formatShort(jobOf(a).endDate)}</span> },
    { key: "on", header: "Applied", cell: (a) => <span className="tabular-nums">{formatShort(a.appliedOn)}</span> },
    { key: "st", header: "Status", cell: (a) => <ApplicationChip status={a.status} /> },
    { key: "act", header: "", align: "right", cell: (a) => a.status === "pending" ? <Button size="sm" variant="danger" onClick={() => withdraw(a)}>{t("Withdraw")}</Button> : null },
  ];

  return (
    <div>
      <PageHeader title="My Applications" subtitle="Track every job you have applied for" />
      <div className="grid gap-5 grid-cols-1 sm:grid-cols-3">
        <StatCard label="Pending" value={String(count("pending"))} icon={<Clock size={22} strokeWidth={1.6} />} tone="amber" hint="Waiting for the contractor" />
        <StatCard label="Accepted" value={String(count("accepted"))} icon={<CheckCircle2 size={22} strokeWidth={1.6} />} tone="green" />
        <StatCard label="Rejected" value={String(count("rejected"))} icon={<XCircle size={22} strokeWidth={1.6} />} tone="red" />
      </div>
      <Card className="mt-5 overflow-hidden">
        <div className="px-4 pt-3 md:px-6">
          <Tabs<F> label="Application status" value={f} onChange={setF} items={[
            { id: "all", label: "All", count: mine.length }, { id: "pending", label: "Pending", count: count("pending") },
            { id: "accepted", label: "Accepted", count: count("accepted") }, { id: "rejected", label: "Rejected", count: count("rejected") },
          ]} />
        </div>
        <DataTable caption="My Applications" columns={columns} rows={rows} rowKey={(a) => a.id}
          empty={<EmptyState icon={<FileText size={24} />} title="No applications yet" body="Jobs you apply for will show up here." action={<Button variant="primary" href="/worker/jobs">{t("Find Jobs")}</Button>} />} />
      </Card>
    </div>
  );
}

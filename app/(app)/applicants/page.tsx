"use client";
import { Clock, UserCheck, UserX, Users } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import type { Application, ApplicationStatus } from "@/data/types";
import { workerById } from "@/data/workers";
import { formatShort, yrs } from "@/lib/format";
import { useT } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import { ApplicantActions, ApplicantDrawer, WorkerCell } from "@/components/shared/ApplicantParts";
import { TrustPill } from "@/components/worker/TrustParts";
import { Card } from "@/components/ui/Card";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { Select } from "@/components/ui/Fields";
import { PageHeader, StatCard } from "@/components/ui/PageHeader";
import { Segmented } from "@/components/ui/Segmented";

type F = "all" | ApplicationStatus;

function Inner() {
  const t = useT();
  const { applications, jobs } = useStore();
  const p = useSearchParams().get("status");
  const [status, setStatus] = useState<F>(p === "pending" || p === "accepted" || p === "rejected" ? p : "all");
  const [jobId, setJobId] = useState("all");
  const [open, setOpen] = useState<Application | null>(null);

  const count = (s: ApplicationStatus) => applications.filter((a) => a.status === s).length;
  const rows = useMemo(
    () => applications.filter((a) => (status === "all" || a.status === status) && (jobId === "all" || a.jobId === jobId))
      .sort((a, b) => b.appliedOn.localeCompare(a.appliedOn)),
    [applications, status, jobId],
  );
  const jobOf = (id: string) => jobs.find((j) => j.id === id)!;

  const columns: Column<Application>[] = [
    { key: "w", header: "Applicant", cell: (a) => <WorkerCell workerId={a.workerId} /> },
    { key: "job", header: "Applied for", cell: (a) => `${t(jobOf(a.jobId).title)}, ${t(jobOf(a.jobId).area)}` },
    { key: "exp", header: "Experience", cell: (a) => <span className="tabular-nums">{yrs(workerById(a.workerId).experience)}</span> },
    { key: "trust", header: "Trust", cell: (a) => <TrustPill workerId={a.workerId} /> },
    { key: "on", header: "Applied", cell: (a) => <span className="tabular-nums">{formatShort(a.appliedOn)}</span> },
    { key: "act", header: "", align: "right", cell: (a) => <ApplicantActions app={a} /> },
  ];

  return (
    <div>
      <PageHeader eyebrow="Hiring" title="Applicants" subtitle="Everyone who applied across your jobs" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard tone="slate" icon={<Users size={20} />} label="Total" value={String(applications.length)} />
        <StatCard tone="amber" icon={<Clock size={20} />} label="Pending" value={String(count("pending"))} hint="Waiting for you" />
        <StatCard tone="green" icon={<UserCheck size={20} />} label="Accepted" value={String(count("accepted"))} />
        <StatCard tone="red" icon={<UserX size={20} />} label="Rejected" value={String(count("rejected"))} />
      </div>
      <Card className="mt-6 overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 p-4 md:px-6">
          <Segmented<F> label="Status" value={status} onChange={setStatus} options={[{ id: "all", label: "All" }, { id: "pending", label: "Pending" }, { id: "accepted", label: "Accepted" }, { id: "rejected", label: "Rejected" }]} />
          <Select aria-label={t("Filter by job")} value={jobId} onChange={(e) => setJobId(e.target.value)} className="w-full sm:w-64">
            <option value="all">{t("All jobs")}</option>
            {jobs.map((j) => <option key={j.id} value={j.id}>{t(j.title)} — {t(j.area)}</option>)}
          </Select>
        </div>
        <div className="border-t border-line">
          <DataTable caption="Applicants" columns={columns} rows={rows} rowKey={(a) => a.id} onRowClick={setOpen}
            empty={<EmptyState icon={<Users size={22} />} title="No applicants match" body="Try a different status or job filter." />} />
        </div>
      </Card>
      <ApplicantDrawer app={open} onClose={() => setOpen(null)} />
    </div>
  );
}
export default function ApplicantsPage() { return <Suspense><Inner /></Suspense>; }

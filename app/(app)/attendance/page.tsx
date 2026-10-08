"use client";
import { CalendarCheck, Clock, HelpCircle, UserCheck, UserX } from "lucide-react";
import { useMemo, useState } from "react";
import type { AttendanceMark, Job } from "@/data/types";
import { TODAY, formatDate } from "@/lib/format";
import { useT } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import { WorkerCell } from "@/components/shared/ApplicantParts";
import { Card } from "@/components/ui/Card";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { Select } from "@/components/ui/Fields";
import { PageHeader, StatCard } from "@/components/ui/PageHeader";
import { Segmented } from "@/components/ui/Segmented";
import { useToast } from "@/components/ui/Toast";

interface Row { key: string; job: Job; workerId: string }
type Opt = AttendanceMark | "none";

export default function AttendancePage() {
  const toast = useToast();
  const t = useT();
  const { jobs, acceptedWorkers, getMark, setMark } = useStore();
  const [jobId, setJobId] = useState("all");
  const [view, setView] = useState<"all" | "unmarked">("all");

  const active = jobs.filter((j) => !j.closed && j.startDate <= TODAY && j.endDate >= TODAY);
  const all = useMemo<Row[]>(
    () => active.flatMap((job) => acceptedWorkers(job.id).map((workerId) => ({ key: `${job.id}:${workerId}`, job, workerId }))),
    [active, acceptedWorkers],
  );
  const mark = (r: Row) => getMark(r.job, r.workerId, TODAY);
  const n = (m: AttendanceMark | undefined) => all.filter((r) => mark(r) === m).length;
  const rows = all.filter((r) => (jobId === "all" || r.job.id === jobId) && (view === "all" || !mark(r)));

  const columns: Column<Row>[] = [
    { key: "w", header: "Worker", cell: (r) => <WorkerCell workerId={r.workerId} /> },
    { key: "job", header: "Job", cell: (r) => `${t(r.job.title)}, ${t(r.job.area)}` },
    { key: "mark", header: "Today", cell: (r) => (
      <Segmented<Opt> label="Mark attendance" compact value={mark(r) ?? "none"}
        onChange={(v) => { setMark(r.job, r.workerId, TODAY, v); toast(t("Attendance updated")); }}
        options={[{ id: "P", label: "Present" }, { id: "H", label: "Half" }, { id: "A", label: "Absent" }]} />
    ) },
  ];

  return (
    <div>
      <PageHeader eyebrow="On site" title="Attendance" subtitle={t("Today, {date}", { date: formatDate(TODAY) })} />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard tone="green" icon={<UserCheck size={20} />} label="Present" value={String(n("P"))} />
        <StatCard tone="amber" icon={<Clock size={20} />} label="Half day" value={String(n("H"))} />
        <StatCard tone="red" icon={<UserX size={20} />} label="Absent" value={String(n("A"))} />
        <StatCard tone="slate" icon={<HelpCircle size={20} />} label="Not marked" value={String(n(undefined))} />
      </div>
      <Card className="mt-6 overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 p-4 md:px-6">
          <Segmented<"all" | "unmarked"> label="View" value={view} onChange={setView} options={[{ id: "all", label: "Everyone" }, { id: "unmarked", label: "Unmarked" }]} />
          <Select aria-label={t("Filter by job")} value={jobId} onChange={(e) => setJobId(e.target.value)} className="w-full sm:w-64">
            <option value="all">{t("All active jobs")}</option>
            {active.map((j) => <option key={j.id} value={j.id}>{t(j.title)} — {t(j.area)}</option>)}
          </Select>
        </div>
        <div className="border-t border-line">
          <DataTable caption="Today's attendance" columns={columns} rows={rows} rowKey={(r) => r.key}
            empty={<EmptyState icon={<CalendarCheck size={22} />} title="All caught up" body="Every worker on site has been marked for today." />} />
        </div>
      </Card>
    </div>
  );
}

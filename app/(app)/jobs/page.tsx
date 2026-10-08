"use client";
import { Briefcase, LayoutGrid, List, Search } from "lucide-react";
import { jobHref } from "@/lib/links";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import type { Job, JobStatus } from "@/data/types";
import { formatDate, rateLabel } from "@/lib/format";
import { useT } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { JobStatusChip } from "@/components/ui/Chip";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Tabs } from "@/components/ui/Tabs";
import { JobCard } from "@/components/job/JobCard";
import { SkillIcon } from "@/components/ui/SkillIcon";

type Tab = "all" | JobStatus;

function JobsInner() {
  const router = useRouter();
  const t = useT();
  const { jobs, statusOf, filled } = useStore();
  const [tab, setTab] = useState<Tab>("all");
  const [view, setView] = useState<"grid" | "table">("grid");
  const [q, setQ] = useState(useSearchParams().get("q") ?? "");

  const counts = useMemo(() => {
    const c = { all: jobs.length, open: 0, filled: 0, closed: 0 };
    jobs.forEach((j) => { c[statusOf(j)] += 1; });
    return c;
  }, [jobs, statusOf]);

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return jobs.filter((j) =>
      (tab === "all" || statusOf(j) === tab) &&
      (!term || [j.title, j.skill, j.area, j.id].some((s) => s.toLowerCase().includes(term) || t(s).toLowerCase().includes(term))));
  }, [jobs, tab, q, statusOf, t]);

  const columns: Column<Job>[] = [
    { key: "title", header: "Job", cell: (j) => <span className="flex items-center gap-3"><SkillIcon skill={j.skill} size={36} /><span><span className="block font-medium">{t(j.title)}</span><span className="text-xs font-normal text-ink-mute">{j.id}</span></span></span> },
    { key: "skill", header: "Skill", cell: (j) => t(j.skill) },
    { key: "loc", header: "Location", cell: (j) => t(j.area) },
    { key: "fill", header: "Filled / Needed", className: "min-w-[160px]", cell: (j) => (
      <span className="flex items-center gap-3"><ProgressBar value={filled(j.id)} max={j.needed} className="w-20" /><span className="text-xs font-medium tabular-nums">{filled(j.id)}/{j.needed}</span></span>
    ) },
    { key: "pay", header: "Pay", cell: (j) => <span className="tabular-nums">{rateLabel(j)}</span> },
    { key: "dates", header: "Dates", cell: (j) => <span className="whitespace-nowrap text-ink-soft tabular-nums">{formatDate(j.startDate)} – {formatDate(j.endDate)}</span> },
    { key: "status", header: "Status", cell: (j) => <JobStatusChip status={statusOf(j)} /> },
  ];

  const empty = (
    <EmptyState icon={<Briefcase size={24} />} title="No jobs found" body={q ? t("Nothing matches “{q}”. Try a different search.", { q }) : "No jobs in this view yet."} action={<Button variant="primary" href="/jobs/new">{t("Post a Job")}</Button>} />
  );

  return (
    <div>
      <PageHeader title="Jobs" subtitle={t("{a} jobs posted · {o} still hiring", { a: counts.all, o: counts.open })} />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Tabs<Tab> variant="pill" label="Job status" value={tab} onChange={setTab} items={[
          { id: "all", label: "All", count: counts.all }, { id: "open", label: "Open", count: counts.open },
          { id: "filled", label: "Filled", count: counts.filled }, { id: "closed", label: "Closed", count: counts.closed },
        ]} />
        <div className="flex w-full items-center gap-3 sm:w-auto">
          <div className="relative flex-1 sm:w-64 sm:flex-none">
            <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-mute" />
            <input value={q} onChange={(e) => setQ(e.target.value)} aria-label={t("Search jobs")} placeholder={t("Search jobs…")} className="min-h-11 w-full rounded-2xl bg-white pl-10 pr-3 text-sm shadow-card placeholder:text-ink-mute" />
          </div>
          <div role="radiogroup" aria-label={t("View")} className="hidden rounded-2xl bg-white p-1 shadow-card md:flex">
            {([["grid", LayoutGrid, "Grid view"], ["table", List, "Table view"]] as const).map(([id, Icon, label]) => (
              <button key={id} role="radio" aria-checked={view === id} aria-label={t(label)} onClick={() => setView(id)}
                className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${view === id ? "bg-accent-soft text-accent" : "text-ink-mute hover:text-ink"}`}><Icon size={17} /></button>
            ))}
          </div>
        </div>
      </div>

      {rows.length === 0 ? (
        <Card>{empty}</Card>
      ) : (
        <>
          <div className={view === "grid" ? "grid gap-5 sm:grid-cols-2 xl:grid-cols-3" : "grid gap-5 sm:grid-cols-2 md:hidden"}>
            {rows.map((j) => <JobCard key={j.id} job={j} />)}
          </div>
          {view === "table" && (
            <Card className="hidden overflow-hidden md:block">
              <DataTable caption="Jobs" columns={columns} rows={rows} rowKey={(j) => j.id} onRowClick={(j) => router.push(jobHref(j.id))} empty={empty} />
            </Card>
          )}
        </>
      )}
    </div>
  );
}

export default function JobsPage() {
  return <Suspense><JobsInner /></Suspense>;
}

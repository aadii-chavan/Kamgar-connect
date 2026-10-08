"use client";
import { Briefcase, Search } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { currentWorkerId } from "@/data/jobs";
import { workerById } from "@/data/workers";
import { WorkerJobCard } from "@/components/worker/WorkerJobCard";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Tabs } from "@/components/ui/Tabs";
import { useT } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import { isLive } from "@/lib/worker";

type Tab = "all" | "match";

function Inner() {
  const t = useT();
  const { jobs } = useStore();
  const me = workerById(currentWorkerId);
  const [tab, setTab] = useState<Tab>("all");
  const [q, setQ] = useState(useSearchParams().get("q") ?? "");

  const live = useMemo(() => jobs.filter(isLive), [jobs]);
  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return live.filter((j) =>
      (tab === "all" || j.skill === me.skill) &&
      (!term || [j.title, j.skill, j.area].some((s) => s.toLowerCase().includes(term) || t(s).toLowerCase().includes(term))));
  }, [live, tab, q, me.skill, t]);

  return (
    <div>
      <PageHeader title="Find Jobs" subtitle="Daily-wage work near you. Apply in one tap." />
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Tabs<Tab> variant="pill" label="Job filter" value={tab} onChange={setTab} items={[
          { id: "all", label: "All open", count: live.length }, { id: "match", label: "Matches my skill", count: live.filter((j) => j.skill === me.skill).length },
        ]} />
        <div className="relative w-full sm:w-72">
          <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-mute" />
          <input value={q} onChange={(e) => setQ(e.target.value)} aria-label={t("Search jobs")} placeholder={t("Search jobs…")} className="min-h-12 w-full rounded-full bg-white pl-11 pr-4 text-sm shadow-card placeholder:text-ink-mute" />
        </div>
      </div>

      {rows.length === 0 ? (
        <Card><EmptyState icon={<Briefcase size={24} />} title="No jobs found" body={q ? t("Nothing matches “{q}”. Try a different search.", { q }) : "No jobs match your skill right now. Check back soon."} /></Card>
      ) : (
        <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">{rows.map((j) => <WorkerJobCard key={j.id} job={j} />)}</div>
      )}
    </div>
  );
}

export default function WorkerJobsPage() {
  return <Suspense><Inner /></Suspense>;
}

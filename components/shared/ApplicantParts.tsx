"use client";
import { Check, X } from "lucide-react";
import { CITY } from "@/data/jobs";
import Link from "next/link";
import type { Application } from "@/data/types";
import { workerById } from "@/data/workers";
import { formatDate, yrs } from "@/lib/format";
import { useDecision } from "@/lib/decisions";
import { useT, tn } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import { Avatar } from "../ui/Avatar";
import { Button } from "../ui/Button";
import { ApplicationChip } from "../ui/Chip";
import { Drawer } from "../ui/Drawer";
import { RatingCell, TrustSection } from "../worker/TrustParts";

export function WorkerCell({ workerId, sub, href }: { workerId: string; sub?: string; href?: string }) {
  const t = useT();
  const w = workerById(workerId);
  return (
    <span className="flex items-center gap-3">
      <Avatar name={w.name} size={36} />
      <span className="min-w-0">
        {href ? <Link href={href} onClick={(e) => e.stopPropagation()} className="block truncate font-medium text-ink underline-offset-4 hover:underline">{t(w.name)}</Link> : <span className="block truncate font-medium text-ink">{t(w.name)}</span>}
        <span className="block truncate text-xs font-normal text-ink-mute">{sub ?? `${t(w.skill)} · ${yrs(w.experience)}`}</span>
      </span>
    </span>
  );
}

export function ApplicantActions({ app }: { app: Application }) {
  const { jobs, filled } = useStore();
  const decide = useDecision();
  const t = useT();
  if (app.status !== "pending") return <ApplicationChip status={app.status} />;
  const job = jobs.find((j) => j.id === app.jobId)!;
  const full = filled(job.id) >= job.needed;
  return (
    <span className="flex gap-2" onClick={(e) => e.stopPropagation()}>
      <Button size="sm" variant="dark" disabled={full} title={full ? t("All positions are filled") : undefined} icon={<Check size={16} />} onClick={() => decide(app, "accepted")}>{t("Accept")}</Button>
      <Button size="sm" variant="danger" icon={<X size={16} />} onClick={() => decide(app, "rejected")}>{t("Reject")}</Button>
    </span>
  );
}

export function ApplicantDrawer({ app, onClose }: { app: Application | null; onClose: () => void }) {
  const { jobs, applications, filled } = useStore();
  const decide = useDecision();
  const t = useT();
  const live = applications.find((a) => a.id === app?.id) ?? null;
  const w = live ? workerById(live.workerId) : null;
  const job = live ? jobs.find((j) => j.id === live.jobId) : null;
  const rows: [string, string][] = w && live && job ? [
    [t("Skill"), t(w.skill)], [t("Experience"), tn(t, w.experience, "{n} year", "{n} years")],
    [t("Jobs completed"), String(w.completedJobs)], [t("Lives in"), `${t(w.area)}, ${t(CITY)}`],
    [t("Languages"), w.languages.map((l) => t(l)).join(", ")], [t("Phone"), w.phone],
    [t("Applied for"), `${t(job.title)}, ${t(job.area)}`], [t("Applied on"), formatDate(live.appliedOn)],
  ] : [];
  const full = job ? filled(job.id) >= job.needed : false;
  return (
    <Drawer
      open={!!live} onClose={onClose} title="Applicant profile"
      footer={live?.status === "pending" ? (
        <>
          <Button variant="primary" className="flex-1" disabled={full} icon={<Check size={16} />} onClick={() => decide(live, "accepted")}>{t("Accept")}</Button>
          <Button variant="danger" className="flex-1" icon={<X size={16} />} onClick={() => decide(live, "rejected")}>{t("Reject")}</Button>
        </>
      ) : undefined}
    >
      {w && live && (
        <div>
          <div className="flex items-center gap-4">
            <Avatar name={w.name} size={56} />
            <div>
              <div className="text-lg font-medium">{t(w.name)}</div>
              <div className="mt-1 flex items-center gap-3 text-sm text-ink-soft">
                <RatingCell workerId={w.id} />
                <ApplicationChip status={live.status} />
              </div>
            </div>
          </div>
          <TrustSection workerId={w.id} />
          <dl className="mt-6 divide-y divide-line rounded-xl border border-line">
            {rows.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 px-4 py-3 text-sm">
                <dt className="text-ink-mute">{k}</dt>
                <dd className="text-right font-medium tabular-nums">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </Drawer>
  );
}

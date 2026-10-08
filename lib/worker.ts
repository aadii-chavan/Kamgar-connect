"use client";
import { useCallback } from "react";
import { currentWorkerId } from "@/data/jobs";
import type { Application, Job } from "@/data/types";
import { useToast } from "@/components/ui/Toast";
import { TODAY } from "./format";
import { useT } from "./i18n";
import { useStore } from "./store";

/** A job that is still running or upcoming (not closed, not past its end date). */
export const isLive = (job: Job) => !job.closed && job.endDate >= TODAY;

/** Apply to / withdraw from a job as the signed-in worker, with an Undo toast. */
export function useApply() {
  const { applyToJob, withdrawApplication, jobs } = useStore();
  const toast = useToast();
  const t = useT();

  const apply = useCallback(async (job: Job) => {
    try {
      const app = await applyToJob(job.id, currentWorkerId);
      toast(t("Applied for {job}", { job: t(job.title) }), { label: "Undo", onClick: () => withdrawApplication(app.id) });
    } catch (e) { toast(e instanceof Error ? e.message : t("Could not apply. Please try again.")); }
  }, [applyToJob, withdrawApplication, toast, t]);

  const withdraw = useCallback((app: Application) => {
    const job = jobs.find((j) => j.id === app.jobId);
    withdrawApplication(app.id);
    if (job) toast(t("Application withdrawn"), { label: "Undo", onClick: () => void applyToJob(job.id, currentWorkerId) });
  }, [jobs, applyToJob, withdrawApplication, toast, t]);

  return { apply, withdraw };
}

"use client";
import { useCallback } from "react";
import type { Application } from "@/data/types";
import { workerById } from "@/data/workers";
import { useToast } from "@/components/ui/Toast";
import { useStore } from "./store";
import { useT } from "./i18n";

/** Accept / reject an application with an Undo toast. */
export function useDecision() {
  const { jobs, filled, setApplicationStatus } = useStore();
  const toast = useToast();
  const t = useT();
  return useCallback(
    (app: Application, next: "accepted" | "rejected") => {
      const job = jobs.find((j) => j.id === app.jobId);
      if (!job) return;
      if (next === "accepted" && filled(job.id) >= job.needed) {
        toast(t("{job} already has all {n} workers", { job: t(job.title), n: job.needed }));
        return;
      }
      const prev = app.status;
      const willFill = next === "accepted" && filled(job.id) + 1 >= job.needed;
      setApplicationStatus(app.id, next);
      const name = workerById(app.workerId).name;
      toast(
        t(next === "accepted" ? "Accepted {name}" : "Rejected {name}", { name: t(name) }) + (willFill ? " · " + t("{job} is now Filled", { job: t(job.title) }) : ""),
        { label: "Undo", onClick: () => setApplicationStatus(app.id, prev) },
      );
    },
    [jobs, filled, setApplicationStatus, toast, t],
  );
}

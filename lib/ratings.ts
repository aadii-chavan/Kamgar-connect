"use client";
import { useMemo } from "react";
import { workerById } from "@/data/workers";
import { reviewsAboutContractor, reviewsAboutWorker, statsOf } from "./reviews";
import { contractorScore, levelOf } from "./contractorTrust";
import { useStore } from "./store";

/** Public rating of a worker from contractors' reviews. */
export function useWorkerRating(workerId: string) {
  const { reviews, jobs } = useStore();
  return useMemo(() => {
    const list = reviewsAboutWorker(reviews, jobs, workerId);
    const stats = statsOf(list);
    return { list, stats, rating: stats.avg ?? workerById(workerId).rating, hasReviews: stats.count > 0 };
  }, [reviews, jobs, workerId]);
}

/** Public rating of the contractor from workers' reviews. */
export function useContractorRating(contractorId?: string) {
  const { reviews, jobs, userId } = useStore();
  const id = contractorId ?? userId ?? undefined;
  return useMemo(() => {
    const list = reviewsAboutContractor(reviews, jobs, id);
    const stats = statsOf(list);
    const onTime = list.length ? Math.round((list.filter((r) => r.criteria[0] >= 4).length / list.length) * 100) : 0;
    return { list, stats, rating: stats.avg ?? 0, onTimePct: onTime };
  }, [reviews, jobs, id]);
}

/** What workers see about a contractor (the signed-in one by default), from the real profile and reviews. */
export function useContractorTrust(contractorId?: string) {
  const { contractorProfile, contractorProfiles, sites, userId } = useStore();
  const id = contractorId ?? userId ?? "";
  const p = id === userId ? contractorProfile : contractorProfiles[id] ?? contractorProfile;
  const mine = useMemo(() => sites.filter((x) => x.contractorId === id), [sites, id]);
  const { stats, onTimePct } = useContractorRating(id);
  const score = contractorScore(p, mine, stats.count);
  return {
    p, sites: mine, score, level: levelOf(score), onTimePct,
  };
}

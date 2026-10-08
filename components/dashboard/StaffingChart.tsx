"use client";
import Link from "next/link";
import { jobHref } from "@/lib/links";
import { useState } from "react";
import { useT } from "@/lib/i18n";
import type { Job } from "@/data/types";
import { cn } from "../ui/cn";

/** One column per active job: how many of the needed workers are confirmed. */
export function StaffingChart({ jobs, filled }: { jobs: Job[]; filled: (id: string) => number }) {
  const t = useT();
  const [hover, setHover] = useState<string | null>(null);
  const current = jobs.find((j) => j.id === hover) ?? jobs[0];
  return (
    <div className="relative mt-14 flex min-h-[208px] flex-1 items-end gap-3" onMouseLeave={() => setHover(null)}>
      {jobs.map((j) => {
        const f = filled(j.id), pct = Math.max((f / j.needed) * 100, 4);
        const on = j.id === current?.id;
        return (
          <Link
            key={j.id} href={jobHref(j.id)} onMouseEnter={() => setHover(j.id)} onFocus={() => setHover(j.id)}
            aria-label={`${t(j.title)}: ${f}/${j.needed}`} className="group relative flex h-full flex-1 flex-col justify-end rounded-t-2xl bg-canvas"
          >
            <span className={cn("block w-full rounded-t-2xl transition-colors", on ? "bg-ink" : "bg-[#D9D2CA]")} style={{ height: `${pct}%` }} />
            {on && (
              <span className="absolute -top-1 left-1/2 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-full bg-ink px-4 py-2 text-sm text-white shadow-pop tabular-nums">
                ↗ {f}/{j.needed} · {t(j.skill)}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}

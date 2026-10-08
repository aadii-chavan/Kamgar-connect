"use client";
import { Star } from "lucide-react";
import { useT } from "@/lib/i18n";
import type { Stats } from "@/lib/reviews";
import { cn } from "../ui/cn";

/** Read-only stars (supports halves via a clipped overlay). */
export function Stars({ value, size = 16, className }: { value: number; size?: number; className?: string }) {
  const t = useT();
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)} role="img" aria-label={t("{n} out of 5", { n: value.toFixed(1) })}>
      {[1, 2, 3, 4, 5].map((i) => {
        const fill = Math.max(0, Math.min(1, value - (i - 1)));
        return (
          <span key={i} className="relative inline-block" style={{ width: size, height: size }} aria-hidden>
            <Star size={size} className="absolute inset-0 fill-[#E6DFD7] text-[#E6DFD7]" />
            <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
              <Star size={size} className="fill-[#F2A93B] text-[#F2A93B]" />
            </span>
          </span>
        );
      })}
    </span>
  );
}

/** Accessible 1–5 star picker. */
export function StarInput({ value, onChange, label, size = 34, compact }: { value: number; onChange: (v: number) => void; label: string; size?: number; compact?: boolean }) {
  const t = useT();
  return (
    <div role="radiogroup" aria-label={t(label)} className="inline-flex gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i} type="button" role="radio" aria-checked={value === i} aria-label={t("{n} stars", { n: i })} onClick={() => onChange(i)}
          className={cn("flex h-11 items-center justify-center rounded-full transition-transform hover:scale-110 focus-visible:outline-offset-0", compact ? "w-9" : "w-11")}
        >
          <Star size={size - 6} className={cn("transition-colors", i <= value ? "fill-[#F2A93B] text-[#F2A93B]" : "fill-transparent text-ink-mute/50")} />
        </button>
      ))}
    </div>
  );
}

/** Average, count and 5-to-1 distribution. */
export function RatingSummary({ stats, className }: { stats: Stats; className?: string }) {
  const t = useT();
  if (!stats.avg) {
    return <p className={cn("text-sm text-ink-mute", className)}>{t("No reviews yet")}</p>;
  }
  return (
    <div className={cn("flex flex-wrap items-center gap-x-8 gap-y-4", className)}>
      <div>
        <div className="text-[52px] font-normal leading-none tracking-tight tabular-nums">{stats.avg.toFixed(1)}</div>
        <Stars value={stats.avg} size={18} className="mt-2" />
        <div className="mt-1 text-sm text-ink-mute tabular-nums">{stats.count === 1 ? t("{n} review", { n: 1 }) : t("{n} reviews", { n: stats.count })}</div>
      </div>
      <ul className="min-w-[180px] flex-1 space-y-1.5" aria-label={t("Rating breakdown")}>
        {[5, 4, 3, 2, 1].map((s) => (
          <li key={s} className="flex items-center gap-3 text-xs text-ink-mute">
            <span className="w-3 tabular-nums">{s}</span>
            <span className="h-2 flex-1 overflow-hidden rounded-full bg-canvas"><span className="block h-full rounded-full bg-[#F2A93B]" style={{ width: `${(stats.dist[s - 1] / stats.count) * 100}%` }} /></span>
            <span className="w-5 text-right tabular-nums">{stats.dist[s - 1]}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

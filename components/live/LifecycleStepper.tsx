"use client";
import { Check } from "lucide-react";
import { useT } from "@/lib/i18n";
import { cn } from "../ui/cn";

export interface Step { label: string; state: "done" | "current" | "todo"; hint?: string }

/** Horizontal progress through a job, from posting to reviews. */
export function LifecycleStepper({ steps, className, label }: { steps: Step[]; className?: string; label: string }) {
  const t = useT();
  return (
    <ol className={cn("flex gap-0 overflow-x-auto pb-1", className)} aria-label={t(label)}>
      {steps.map((s, i) => (
        <li key={s.label} aria-current={s.state === "current" ? "step" : undefined} className="relative flex min-w-[96px] flex-1 flex-col items-center px-1 text-center">
          {i > 0 && <span aria-hidden className={cn("absolute right-1/2 top-4 h-0.5 w-full", s.state === "todo" ? "bg-line" : "bg-ink")} />}
          <span className={cn("relative z-10 flex h-8 w-8 items-center justify-center rounded-full text-xs tabular-nums ring-4 ring-white",
            s.state === "done" ? "bg-ink text-white" : s.state === "current" ? "bg-[#E0662B] text-white" : "bg-canvas text-ink-mute")}>
            {s.state === "done" ? <Check size={15} /> : i + 1}
          </span>
          <span className={cn("mt-2 text-[13px] leading-tight", s.state === "todo" ? "text-ink-mute" : "text-ink")}>{t(s.label)}</span>
          {s.hint && <span className="mt-0.5 text-[11px] text-ink-mute">{s.hint}</span>}
        </li>
      ))}
    </ol>
  );
}

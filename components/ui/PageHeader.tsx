import type { ReactNode } from "react";
import { useT } from "@/lib/i18n";
import { cn } from "./cn";

/** The big white page title lives in the app shell; this keeps an accessible h1, a subtitle on the gradient, and page actions. */
export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode; eyebrow?: string }) {
  const t = useT();
  return (
    <div className={cn("mb-8 flex flex-wrap items-center justify-between gap-4", !subtitle && !action && "mb-0")}>
      <h1 className="sr-only">{t(title)}</h1>
      {subtitle && <p className="text-lg text-white/80">{t(subtitle)}</p>}
      {action}
    </div>
  );
}

export type StatTone = "orange" | "blue" | "green" | "amber" | "red" | "slate";
const toneCls: Record<StatTone, string> = {
  orange: "text-[#D9622A]", blue: "text-[#B4470F]", green: "text-ok-fg",
  amber: "text-warn-fg", red: "text-bad-fg", slate: "text-ink-soft",
};

/** Soft round badge used beside small facts. */
export function Badge({ children, tone = "slate", size = 48 }: { children: ReactNode; tone?: StatTone; size?: number }) {
  return (
    <span style={{ width: size, height: size }} className={cn("flex shrink-0 items-center justify-center rounded-full bg-canvas", toneCls[tone])}>
      {children}
    </span>
  );
}

/** Stat tile: muted title top-left, outline icon top-right, large figure, small hint. */
export function StatCard({ label, value, hint, icon, tone = "slate" }: { label: string; value: ReactNode; hint?: ReactNode; icon?: ReactNode; tone?: StatTone }) {
  const t = useT();
  return (
    <div className="flex min-h-[168px] flex-col justify-between rounded-3xl bg-white p-6 shadow-card transition-shadow hover:shadow-lift md:p-7">
      <div className="flex items-start justify-between gap-3">
        <span className="text-[19px] leading-snug text-ink-soft">{t(label)}</span>
        {icon && <span className={cn("mt-0.5 shrink-0", toneCls[tone])}>{icon}</span>}
      </div>
      <div>
        <div className="whitespace-nowrap text-[34px] font-normal leading-none tracking-tight text-ink tabular-nums md:text-[38px]">{value}</div>
        {hint && <div className="mt-3 text-sm text-ink-soft">{typeof hint === "string" ? t(hint) : hint}</div>}
      </div>
    </div>
  );
}

import { useT } from "@/lib/i18n";
import { cn } from "./cn";

export function ProgressBar({ value, max, className }: { value: number; max: number; className?: string }) {
  const t = useT();
  const pct = max === 0 ? 0 : Math.min(100, (value / max) * 100);
  const full = value >= max;
  return (
    <div
      role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}
      aria-label={t("{v} of {m} filled", { v: value, m: max })}
      className={cn("h-2 w-full overflow-hidden rounded-full bg-canvas", className)}
    >
      <div
        className={cn("h-full rounded-full transition-all duration-500", full ? "bg-ok-fg" : "bg-gradient-to-r from-[#F2A254] to-[#D9531E]")}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

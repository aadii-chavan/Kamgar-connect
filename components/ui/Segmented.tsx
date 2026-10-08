"use client";
import { useT } from "@/lib/i18n";
import { cn } from "./cn";

export function Segmented<T extends string>({ options, value, onChange, label, compact, glass }: {
  options: { id: T; label: string }[]; value: T; onChange: (v: T) => void; label: string; compact?: boolean; glass?: boolean;
}) {
  const t = useT();
  return (
    <div role="radiogroup" aria-label={t(label)} className={cn("inline-flex rounded-full p-1", glass ? "glass" : "bg-canvas")}>
      {options.map((o) => {
        const active = o.id === value;
        return (
          <button
            key={o.id} role="radio" aria-checked={active} onClick={() => onChange(o.id)}
            className={cn(
              "rounded-full px-3.5 text-sm transition-all",
              compact ? "min-h-9" : "min-h-11 md:min-h-9",
              glass
                ? active ? "bg-white font-medium text-ink" : "text-white/85 hover:text-white"
                : active ? "bg-white font-medium text-ink shadow-badge" : "text-ink-soft hover:text-ink",
            )}
          >
            {t(o.label)}
          </button>
        );
      })}
    </div>
  );
}

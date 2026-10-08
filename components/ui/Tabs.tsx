"use client";
import { useT } from "@/lib/i18n";
import { cn } from "./cn";

export interface TabItem<T extends string> { id: T; label: string; count?: number }

export function Tabs<T extends string>({ items, value, onChange, label, variant = "line" }: {
  items: TabItem<T>[]; value: T; onChange: (v: T) => void; label: string; variant?: "line" | "pill";
}) {
  const t = useT();
  const pill = variant === "pill";
  return (
    <div
      role="tablist" aria-label={t(label)}
      className={cn("flex gap-1 overflow-x-auto", pill ? "w-full rounded-full bg-white p-1.5 shadow-card sm:w-fit" : "border-b border-line")}
    >
      {items.map((it) => {
        const active = it.id === value;
        return (
          <button
            key={it.id} role="tab" aria-selected={active} onClick={() => onChange(it.id)}
            className={cn(
              "inline-flex min-h-11 flex-1 items-center justify-center gap-2 whitespace-nowrap px-5 text-[15px] transition-all sm:flex-none",
              pill
                ? cn("rounded-full", active ? "bg-ink font-medium text-white" : "text-ink-soft hover:bg-canvas hover:text-ink")
                : cn("-mb-px border-b-2", active ? "border-ink font-medium text-ink" : "border-transparent text-ink-mute hover:text-ink"),
            )}
          >
            {t(it.label)}
            {it.count !== undefined && (
              <span className={cn("rounded-full px-2 py-0.5 text-xs tabular-nums", active ? "bg-white/20 text-white" : "bg-canvas text-ink-mute")}>{it.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

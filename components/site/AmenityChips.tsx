"use client";
import { Bus, Droplets, HardHat, HeartPulse, Sun, Toilet, UtensilsCrossed, type LucideIcon } from "lucide-react";
import type { Amenity } from "@/data/types";
import { useT } from "@/lib/i18n";
import { cn } from "../ui/cn";

export const AMENITIES: { id: Amenity; label: string; icon: LucideIcon }[] = [
  { id: "water", label: "Drinking water", icon: Droplets },
  { id: "toilet", label: "Toilet", icon: Toilet },
  { id: "firstAid", label: "First aid kit", icon: HeartPulse },
  { id: "helmets", label: "Helmets provided", icon: HardHat },
  { id: "meals", label: "Meals", icon: UtensilsCrossed },
  { id: "shade", label: "Rest shade", icon: Sun },
  { id: "transport", label: "Transport", icon: Bus },
];

/** Small read-only chips for what a site provides to workers. */
export function AmenityChips({ amenities, max, className, compact }: { amenities: Amenity[]; max?: number; className?: string; compact?: boolean }) {
  const t = useT();
  const list = AMENITIES.filter((a) => amenities.includes(a.id));
  const shown = max ? list.slice(0, max) : list;
  if (list.length === 0) return <p className="text-xs text-ink-mute">{t("No amenities listed")}</p>;
  return (
    <ul className={cn("flex flex-wrap gap-1.5", className)} aria-label={t("Site amenities")}>
      {shown.map((a) => (
        <li key={a.id} title={t(a.label)} className={cn("inline-flex items-center gap-1.5 rounded-full bg-ok-bg text-ok-fg", compact ? "p-1.5" : "px-3 py-1 text-[13px]")}>
          <a.icon size={compact ? 14 : 14} aria-hidden />{compact ? <span className="sr-only">{t(a.label)}</span> : t(a.label)}
        </li>
      ))}
      {max && list.length > max && <li className="rounded-full bg-canvas px-2.5 py-1 text-xs text-ink-mute">+{list.length - max}</li>}
    </ul>
  );
}

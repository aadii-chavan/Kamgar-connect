"use client";
import { AlarmClock, BadgeCheck, Camera, CheckCircle2, Coffee, Flag, LogIn, LogOut, MapPin, Navigation, PlayCircle, Reply } from "lucide-react";
import { useState } from "react";
import type { ProofPhoto, Shift, ShiftEventType, ShiftStatus } from "@/data/types";
import { useT } from "@/lib/i18n";
import { fmtClock } from "@/lib/time";
import { Chip, type Tone } from "../ui/Chip";
import { Lightbox, type Slide } from "../ui/Lightbox";
import { cn } from "../ui/cn";

export const STATUS_LABEL: Record<ShiftStatus, string> = {
  scheduled: "Not started", on_the_way: "On the way", arrived: "Arrived", working: "Working", break: "On break",
  done: "Waiting for approval", approved: "Approved", disputed: "Question raised",
};
const STATUS_TONE: Record<ShiftStatus, Tone> = {
  scheduled: "slate", on_the_way: "amber", arrived: "blue", working: "green", break: "amber", done: "blue", approved: "green", disputed: "red",
};
export function ShiftChip({ status, overdue, className }: { status: ShiftStatus; overdue?: boolean; className?: string }) {
  const t = useT();
  return <Chip tone={overdue ? "red" : STATUS_TONE[status]} className={className}>{overdue ? t("Late to start") : t(STATUS_LABEL[status])}</Chip>;
}

const EVENT: Record<ShiftEventType, { label: string; icon: typeof Flag }> = {
  journey_started: { label: "Started the journey", icon: Navigation },
  arrived: { label: "Arrived at the site", icon: MapPin },
  checked_in: { label: "Checked in and started work", icon: LogIn },
  break_started: { label: "Break started", icon: Coffee },
  break_ended: { label: "Back from break", icon: PlayCircle },
  proof_added: { label: "Added a proof photo", icon: Camera },
  checked_out: { label: "Checked out", icon: LogOut },
  approved: { label: "Approved by the contractor", icon: BadgeCheck },
  disputed: { label: "Contractor asked a question", icon: Flag },
  resubmitted: { label: "Worker replied", icon: Reply },
};

/** Vertical log of what happened and when. */
export function ShiftTimeline({ shift, lateMin, className }: { shift: Shift; lateMin?: number; className?: string }) {
  const t = useT();
  const events = [...shift.events].sort((a, b) => a.at - b.at);
  if (events.length === 0) return <p className={cn("text-sm text-ink-mute", className)}>{t("Nothing has happened yet today.")}</p>;
  return (
    <ol className={cn("relative space-y-4 border-l-2 border-line pl-6", className)} aria-label={t("Timeline")}>
      {events.map((e, i) => {
        const I = EVENT[e.type].icon;
        return (
          <li key={`${e.type}-${e.at}-${i}`} className="relative">
            <span className="absolute -left-[37px] flex h-8 w-8 items-center justify-center rounded-full bg-canvas text-ink-soft ring-4 ring-white"><I size={15} /></span>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-[15px] text-ink">{t(EVENT[e.type].label)}</span>
              <span className="text-xs tabular-nums text-ink-mute">{fmtClock(e.at)}</span>
            </div>
            {e.type === "checked_in" && !!lateMin && <div className="mt-0.5 flex items-center gap-1 text-xs text-bad-fg"><AlarmClock size={12} />{t("{n} min late", { n: lateMin })}</div>}
            {e.note && <p className="mt-0.5 text-sm text-ink-soft">{e.note}</p>}
          </li>
        );
      })}
    </ol>
  );
}

/** A grid of proof-of-work photos that opens a viewer. */
export function ProofGrid({ proofs, jobTitle, onRemove, cols = "grid-cols-2 sm:grid-cols-3" }: { proofs: ProofPhoto[]; jobTitle: string; onRemove?: (id: string) => void; cols?: string }) {
  const t = useT();
  const [open, setOpen] = useState<number | null>(null);
  if (proofs.length === 0) return <p className="text-sm text-ink-mute">{t("No proof photos yet.")}</p>;
  const slides: Slide[] = proofs.map((p) => ({
    key: p.id, title: `${t(KIND[p.kind])} · ${t(jobTitle)}`, meta: fmtClock(p.at), body: p.caption && p.caption !== p.kind ? p.caption : undefined,
    node: (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={p.src} alt={p.caption} />
    ),
  }));
  return (
    <>
      <ul className={cn("grid gap-3", cols)}>
        {proofs.map((p, i) => (
          <li key={p.id} className="relative overflow-hidden rounded-2xl bg-canvas">
            <button type="button" onClick={() => setOpen(i)} aria-label={`${t(KIND[p.kind])} ${fmtClock(p.at)}`} className="block aspect-[4/3] w-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.src} alt="" className="h-full w-full object-cover" />
            </button>
            <div className="flex items-center justify-between px-3 py-2 text-xs">
              <Chip tone={p.kind === "after" ? "green" : p.kind === "before" ? "amber" : "blue"}>{t(KIND[p.kind])}</Chip>
              <span className="whitespace-nowrap tabular-nums text-ink-mute">{fmtClock(p.at)}</span>
            </div>
            {onRemove && <button onClick={() => onRemove(p.id)} aria-label={t("Remove photo")} className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-ink/75 text-white">×</button>}
          </li>
        ))}
      </ul>
      {open !== null && <Lightbox slides={slides} start={open} onClose={() => setOpen(null)} />}
    </>
  );
}
export const KIND: Record<ProofPhoto["kind"], string> = { before: "Before", during: "During", after: "After" };

export const DoneIcon = CheckCircle2;

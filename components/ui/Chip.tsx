import type { ReactNode } from "react";
import type { ApplicationStatus, JobStatus } from "@/data/types";
import type { PayStatus } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { cn } from "./cn";

export type Tone = "green" | "amber" | "red" | "slate" | "blue";
const tones: Record<Tone, string> = {
  green: "bg-ok-bg text-ok-fg",
  amber: "bg-warn-bg text-warn-fg",
  red: "bg-bad-bg text-bad-fg",
  slate: "bg-neutral-bg text-neutral-fg",
  blue: "bg-info-bg text-info-fg",
};

export function Chip({ tone = "slate", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-medium whitespace-nowrap", tones[tone], className)}>
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
      {children}
    </span>
  );
}

const jobTone: Record<JobStatus, [Tone, string]> = { open: ["blue", "Open"], filled: ["green", "Filled"], closed: ["slate", "Closed"] };
export function JobStatusChip({ status }: { status: JobStatus }) {
  const t = useT();
  return <Chip tone={jobTone[status][0]}>{t(jobTone[status][1])}</Chip>;
}

const appTone: Record<ApplicationStatus, [Tone, string]> = { pending: ["amber", "Pending"], accepted: ["green", "Accepted"], rejected: ["red", "Rejected"] };
export function ApplicationChip({ status }: { status: ApplicationStatus }) {
  const t = useT();
  return <Chip tone={appTone[status][0]}>{t(appTone[status][1])}</Chip>;
}

const payTone: Record<PayStatus, [Tone, string]> = { paid: ["green", "Paid"], pending: ["amber", "Pending"], overdue: ["red", "Overdue"] };
export function PayChip({ status }: { status: PayStatus }) {
  const t = useT();
  return <Chip tone={payTone[status][0]}>{t(payTone[status][1])}</Chip>;
}

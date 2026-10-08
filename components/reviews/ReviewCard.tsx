"use client";
import { Flag, ShieldCheck } from "lucide-react";
import type { Review } from "@/data/types";
import { formatDate } from "@/lib/format";
import { useT } from "@/lib/i18n";
import { criteriaFor } from "@/lib/reviews";
import { Avatar } from "../ui/Avatar";
import { Chip } from "../ui/Chip";
import { useStore } from "@/lib/store";
import { useToast } from "../ui/Toast";
import { Stars } from "./Stars";

export function ReviewCard({ review }: { review: Review }) {
  const t = useT();
  const toast = useToast();
  const { reportReview } = useStore();
  const labels = criteriaFor(review.by);
  return (
    <article className="rounded-2xl bg-canvas p-4 md:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={review.fromName} size={44} />
          <div className="min-w-0">
            <div className="truncate text-[16px] text-ink">{t(review.fromName)}</div>
            <div className="truncate text-xs text-ink-mute">{t(review.jobTitle)} · {t(review.jobArea)} · {formatDate(review.date)}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Chip tone="green"><ShieldCheck size={12} className="mr-0.5 inline" />{t("Verified job")}</Chip>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <Stars value={review.rating} size={18} />
        <span className="text-sm tabular-nums text-ink-soft">{review.rating}.0</span>
      </div>
      <p className="mt-2 text-[15px] text-ink-soft">{review.comment}</p>
      <ul className="mt-3 flex flex-wrap gap-2">
        {labels.map((l, i) => (
          <li key={l} className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs text-ink-soft">{t(l)}<b className="font-medium tabular-nums text-ink">{review.criteria[i]}/5</b></li>
        ))}
      </ul>
      <button onClick={async () => { try { await reportReview(review.id); toast(t("Thanks. Our team will check this review.")); } catch { toast(t("You have already reported this review.")); } }} className="mt-3 inline-flex min-h-11 items-center gap-1.5 text-xs text-ink-mute underline-offset-4 hover:text-ink hover:underline">
        <Flag size={12} />{t("Report this review")}
      </button>
    </article>
  );
}

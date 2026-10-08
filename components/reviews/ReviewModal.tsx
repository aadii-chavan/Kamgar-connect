"use client";
import { ShieldCheck } from "lucide-react";
import { useState } from "react";
import { contractorOf } from "@/data/jobs";
import type { Job, ReviewBy } from "@/data/types";
import { workerById } from "@/data/workers";
import { useT } from "@/lib/i18n";
import { counterpartWaiting, criteriaFor, REVEAL_DAYS } from "@/lib/reviews";
import { useStore } from "@/lib/store";
import { Button } from "../ui/Button";
import { Field, Textarea } from "../ui/Fields";
import { Modal } from "../ui/Modal";
import { useToast } from "../ui/Toast";
import { StarInput } from "./Stars";

export interface ReviewCtx { job: Job; workerId: string; by: ReviewBy }

/** Write a review. Final once submitted; the other side's review stays hidden until both exist. */
export function ReviewModal({ ctx, onClose }: { ctx: ReviewCtx | null; onClose: () => void }) {
  const t = useT();
  const toast = useToast();
  const { submitReview, reviews } = useStore();
  const [rating, setRating] = useState(0);
  const [crit, setCrit] = useState<[number, number, number]>([0, 0, 0]);
  const [comment, setComment] = useState("");
  const [honest, setHonest] = useState(false);
  const [tried, setTried] = useState(false);

  const reset = () => { setRating(0); setCrit([0, 0, 0]); setComment(""); setHonest(false); setTried(false); };
  const close = () => { reset(); onClose(); };
  if (!ctx) return <Modal open={false} onClose={onClose} title="">{null}</Modal>;

  const { job, workerId, by } = ctx;
  const worker = workerById(workerId);
  const target = by === "contractor" ? t(worker.name) : t(contractorOf(job.contractorId).company);
  const labels = criteriaFor(by);
  const waiting = counterpartWaiting(reviews, job.id, workerId, by);
  const needsWhy = rating > 0 && rating <= 2 && comment.trim().length < 15;
  const errs = {
    rating: rating === 0 && "Choose an overall rating",
    crit: crit.some((c) => c === 0) && "Rate all three points",
    why: needsWhy && "Please tell us what went wrong (at least 15 characters)",
    honest: !honest && "Please confirm to continue",
  };

  const submit = async () => {
    setTried(true);
    if (Object.values(errs).some(Boolean)) return;
    try {
      await submitReview({ jobId: job.id, jobTitle: job.title, workerId, by, rating, criteria: crit, comment: comment.trim() || t("No written comment.") });
    } catch (err) { toast(err instanceof Error ? err.message : t("Could not submit the review. Please try again.")); return; }
    toast(waiting ? t("Review submitted. Both reviews are now visible.") : t("Review submitted. It will be shown once {name} has reviewed too.", { name: target }));
    close();
  };
  const e = (k: keyof typeof errs) => (tried && errs[k] ? (errs[k] as string) : undefined);

  return (
    <Modal open onClose={close} title={t("Review {name}", { name: target })}
      footer={<><Button onClick={close}>{t("Cancel")}</Button><Button variant="primary" onClick={submit}>{t("Submit review")}</Button></>}>
      <div className="space-y-6">
        <div className="rounded-2xl bg-canvas p-4 text-sm">
          <div className="flex items-center gap-2 text-ok-fg"><ShieldCheck size={16} />{t("Verified job")}</div>
          <div className="mt-1 text-ink">{t(job.title)} · {t(job.area)}</div>
        </div>

        <Field label="Overall rating" error={e("rating")}><StarInput value={rating} onChange={setRating} label="Overall rating" /></Field>
        <div className="space-y-2">
          {labels.map((l, i) => (
            <div key={l} className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[15px] text-ink-soft">{t(l)}</span>
              <StarInput value={crit[i]} onChange={(v) => setCrit((p) => p.map((x, j) => (j === i ? v : x)) as [number, number, number])} label={l} size={30} compact />
            </div>
          ))}
          {e("crit") && <p className="text-xs font-medium text-bad-fg">{t(e("crit")!)}</p>}
        </div>
        <Field label="Your experience (optional)" htmlFor="rv" error={e("why")} hint="Be specific and fair. Your review is shown with your name.">
          <Textarea id="rv" value={comment} onChange={(x) => setComment(x.target.value)} maxLength={300} placeholder={t("What was it like to work together?")} />
        </Field>

        <div className="rounded-2xl border border-line p-4 text-sm text-ink-soft">
          <p>{waiting ? t("{name} has already reviewed this job. Submitting yours will make both reviews visible.", { name: target }) : t("Reviews stay hidden until both of you have submitted, or {n} days after the job ends. This keeps them honest.", { n: REVEAL_DAYS })}</p>
          <p className="mt-2">{t("A review cannot be edited or deleted after it is submitted.")}</p>
        </div>
        <label className="flex cursor-pointer items-start gap-3 text-[15px] text-ink-soft">
          <input type="checkbox" checked={honest} onChange={(x) => setHonest(x.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-[#15110E]" />
          <span>{t("I worked on this job and this review is honest.")}</span>
        </label>
        {e("honest") && <p className="-mt-3 text-xs font-medium text-bad-fg">{t(e("honest")!)}</p>}
      </div>
    </Modal>
  );
}

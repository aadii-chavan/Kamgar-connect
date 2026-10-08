"use client";
import { AlarmClock, ArrowRight, BadgeCheck, Camera, Coffee, ExternalLink, LogIn, MapPin, Navigation, Phone, Play, Send } from "lucide-react";
import { useMemo, useState, type ChangeEvent } from "react";
import { contractorOf, currentWorkerId } from "@/data/jobs";
import type { Job, ProofPhoto, Shift } from "@/data/types";
import { LifecycleStepper, type Step } from "@/components/live/LifecycleStepper";
import { ProofGrid, ShiftChip, ShiftTimeline } from "@/components/live/ShiftParts";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field, Textarea } from "@/components/ui/Fields";
import { Modal } from "@/components/ui/Modal";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Segmented } from "@/components/ui/Segmented";
import { SkillIcon } from "@/components/ui/SkillIcon";
import { useToast } from "@/components/ui/Toast";
import { TODAY, formatDate, formatINR, formatShort, rateLabel } from "@/lib/format";
import { fileToDataUrl } from "@/lib/images";
import { useNow } from "@/lib/live";
import { tn, useT } from "@/lib/i18n";
import { fmtClock, fmtDur, fmtTimer, MIN, reportAt, reportTimeOf, shiftHoursOf } from "@/lib/time";
import { breakMs, isOverdue, lateMinutes, workedMs } from "@/lib/shifts";
import { earnedFor, useStore } from "@/lib/store";
import { isLive } from "@/lib/worker";

const KINDS: { id: ProofPhoto["kind"]; label: string }[] = [{ id: "before", label: "Before" }, { id: "during", label: "During" }, { id: "after", label: "After" }];

export default function TodayPage() {
  const t = useT();
  const toast = useToast();
  const now = useNow();
  const { jobs, applications, shiftOf, worker, payroll, reviews } = useStore();
  const [finishOpen, setFinishOpen] = useState(false);
  const [kind, setKind] = useState<ProofPhoto["kind"]>("before");
  const [caption, setCaption] = useState("");
  const [note, setNote] = useState("");
  const [reply, setReply] = useState("");

  const mine = useMemo(() => applications.filter((a) => a.workerId === currentWorkerId && a.status === "accepted").map((a) => jobs.find((j) => j.id === a.jobId)).filter((j): j is Job => !!j), [applications, jobs]);
  const job = mine.find((j) => isLive(j) && j.startDate <= TODAY);
  const upcoming = mine.filter((j) => isLive(j) && j.startDate > TODAY).sort((a, b) => a.startDate.localeCompare(b.startDate));

  if (!job) {
    return (
      <Card>
        <EmptyState icon={<MapPin size={24} />} title="No work scheduled today"
          body={upcoming.length ? t("Your next job, {job}, starts on {date}.", { job: t(upcoming[0].title), date: formatDate(upcoming[0].startDate) }) : "Apply for a job and once the contractor accepts you, your day will appear here."}
          action={<Button variant="primary" href="/worker/jobs">{t("Find Jobs")}</Button>} />
      </Card>
    );
  }

  const s = shiftOf(job, currentWorkerId);
  const report = reportAt(job);
  const contractor = contractorOf(job.contractorId);
  const worked = workedMs(s, now);
  const onBreak = s.status === "break";
  const overdue = isOverdue(job, s, now);
  const late = s.lateMin ?? lateMinutes(job, s);
  const hours = shiftHoursOf(job);
  const amountFor = (mark: "P" | "H" | "A") => earnedFor(job, mark === "P" ? 1 : mark === "H" ? 0.5 : 0);

  const row = payroll.find((r) => r.job.id === job.id && r.workerId === currentWorkerId);
  const reviewed = reviews.some((r) => r.jobId === job.id && r.workerId === currentWorkerId && r.by === "worker");
  const st = s.status;
  const cur = st === "scheduled" || st === "on_the_way" ? 1 : st === "arrived" ? 2 : st === "working" || st === "break" ? 3 : st === "done" || st === "disputed" ? 4 : 6;
  const steps: Step[] = ["Accepted", "On the way", "Arrived", "Working", "Checked out", "Approved"].map((label, i) => ({ label, state: i === 0 || i < cur ? "done" : i === cur ? "current" : "todo" }));
  const journey: Step[] = [
    { label: "Applied", state: "done" }, { label: "Accepted", state: "done" },
    { label: "Today's shift", state: st === "approved" ? "done" : "current" },
    { label: "Approved", state: st === "approved" ? "done" : "todo" },
    { label: "Paid", state: row?.status === "paid" ? "done" : st === "approved" ? "current" : "todo" },
    { label: "Reviewed", state: reviewed ? "done" : row?.status === "paid" ? "current" : "todo" },
  ];

  const addPhoto = async (files: File[]) => {
    const src = await fileToDataUrl(files[0], 560, 0.6);
    if (!src) return toast(t("Please choose an image file"));
    worker.addProof(job, { kind, src, caption: caption.trim() || kind });
    setCaption(""); toast(t("Photo added"));
  };
  const canFinish = s.proofs.length >= 1;
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(job.address)}`;
  const editable = st === "working" || st === "break";

  return (
    <div className="space-y-5">
      <p className="text-lg text-white/80 tabular-nums">{formatDate(TODAY)} · {fmtClock(now)}</p>

      {/* Job header */}
      <Card className="p-6 md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <SkillIcon skill={job.skill} size={64} />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3"><h1 className="text-[26px] font-normal leading-tight md:text-[32px]">{t(job.title)}</h1><ShiftChip status={st} overdue={overdue} /></div>
              <p className="mt-1 flex items-start gap-1.5 text-sm text-ink-mute"><MapPin size={14} className="mt-0.5 shrink-0" />{t(job.address)}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="dark" size="sm" href={mapsUrl} icon={<ExternalLink size={15} />}>{t("Open in Maps")}</Button>
            <Button variant="dark" size="sm" href={`tel:${(contractor.phone ?? "").replace(/\s/g, "")}`} icon={<Phone size={15} />}>{t("Call {name}", { name: t(contractor.name.split(" ")[0]) })}</Button>
          </div>
        </div>
        <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-line pt-5 sm:grid-cols-4">
          {[["Report by", fmtClock(report)], ["Pay", rateLabel(job)], ["Hours today", `${hours}h`], ["Contractor", t(contractor.company)]].map(([k, v]) => (
            <div key={k}><dt className="text-xs text-ink-mute">{t(k)}</dt><dd className="truncate text-[16px] tabular-nums">{v}</dd></div>
          ))}
        </dl>
        <LifecycleStepper steps={steps} label="Today's progress" className="mt-6" />
      </Card>

      {/* Action panel */}
      <Card className="p-6 md:p-8">
        {st === "scheduled" && (
          <div>
            <h2 className="text-[24px] font-normal tracking-tight">{overdue ? t("You are late to start") : t("Ready for work?")}</h2>
            <p className="mt-2 text-[16px] text-ink-soft">{t("Report to the site by {time}. Start your journey when you leave, so the contractor knows you are on the way.", { time: fmtClock(report) })}</p>
            {overdue && <p className="mt-3 flex items-center gap-2 rounded-2xl bg-bad-bg p-3 text-sm text-bad-fg"><AlarmClock size={16} />{t("The reporting time was {time}. Start now and let the contractor know.", { time: fmtClock(report) })}</p>}
            <div className="mt-6 flex flex-wrap gap-3">
              <Button variant="primary" size="md" icon={<Navigation size={18} />} className="min-w-[220px] !min-h-14" onClick={() => { worker.startJourney(job); toast(t("Journey started. {name} can see you are on the way.", { name: t(contractor.company) })); }}>{t("Start journey")}</Button>
              <Button variant="secondary" className="!min-h-14" onClick={() => worker.atSite(job)}>{t("I am already at the site")}</Button>
            </div>
          </div>
        )}

        {st === "on_the_way" && (
          <div>
            <h2 className="text-[24px] font-normal tracking-tight">{t("On the way")}</h2>
            <p className="mt-2 text-[16px] text-ink-soft">{t("{name} can see you are on the way. Tap the button when you reach the site.", { name: t(contractor.company) })}</p>
            <dl className="mt-5 grid grid-cols-2 gap-4 sm:max-w-md">
              <div className="rounded-2xl bg-canvas p-4"><dt className="text-xs text-ink-mute">{t("Left at")}</dt><dd className="text-2xl tabular-nums">{fmtClock(s.journeyAt ?? now)}</dd></div>
              <div className="rounded-2xl bg-canvas p-4"><dt className="text-xs text-ink-mute">{t("Travelling for")}</dt><dd className="text-2xl tabular-nums">{fmtDur(Math.max(now - (s.journeyAt ?? now), 0))}</dd></div>
            </dl>
            <Button variant="primary" className="mt-6 min-w-[260px] !min-h-14" icon={<MapPin size={18} />} onClick={() => worker.atSite(job)}>{t("I have arrived at the site")}</Button>
          </div>
        )}

        {st === "arrived" && (
          <div>
            <h2 className="text-[24px] font-normal tracking-tight">{t("You have arrived")}</h2>
            <p className="mt-2 flex items-center gap-2 text-[16px] text-ok-fg"><MapPin size={16} />{t("You are at the site. Check in when you are ready to start.")}</p>
            {lateMinutes(job, { ...s, checkInAt: now }) > 0 && <p className="mt-3 flex items-center gap-2 rounded-2xl bg-warn-bg p-3 text-sm text-warn-fg"><AlarmClock size={16} />{t("You are {n} min late. The contractor will see this when you check in.", { n: lateMinutes(job, { ...s, checkInAt: now }) })}</p>}
            <Button variant="primary" className="mt-6 min-w-[260px] !min-h-14" icon={<LogIn size={18} />} onClick={() => { worker.checkIn(job); toast(t("Checked in. Your work timer has started.")); }}>{t("Check in and start work")}</Button>
          </div>
        )}

        {(st === "working" || st === "break") && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <div className="text-sm text-ink-mute">{onBreak ? t("On break") : t("Time worked")}</div>
              <div className={`mt-1 text-[56px] font-normal leading-none tracking-tight tabular-nums md:text-[72px] ${onBreak ? "text-ink-mute" : ""}`} aria-live="off">{fmtTimer(worked)}</div>
              <p className="mt-2 text-sm text-ink-mute tabular-nums">{t("Started at {time}", { time: fmtClock(s.checkInAt ?? now) })}{late ? ` · ${t("{n} min late", { n: late })}` : ""} · {t("Breaks")}: {fmtDur(breakMs(s, now))}</p>
              <ProgressBar value={Math.min(worked, hours * 60 * MIN)} max={hours * 60 * MIN} className="mt-5 !h-3" />
              <p className="mt-1.5 text-xs text-ink-mute">{t("{a} of {b} hours", { a: (worked / 3_600_000).toFixed(1), b: hours })}</p>
              <div className="mt-6 flex flex-wrap gap-3">
                {onBreak
                  ? <Button variant="primary" icon={<Play size={17} />} onClick={() => worker.endBreak(job)}>{t("End break")}</Button>
                  : <Button variant="secondary" icon={<Coffee size={17} />} onClick={() => worker.startBreak(job)}>{t("Take a break")}</Button>}
                <Button variant="primary" disabled={!canFinish || onBreak} onClick={() => setFinishOpen(true)} icon={<BadgeCheck size={17} />}>{t("Finish work")}</Button>
              </div>
              {!canFinish && <p className="mt-3 text-sm text-warn-fg">{t("Add at least one photo of your work to finish the day.")}</p>}
            </div>
            <div className="lg:col-span-7">
              <h3 className="text-[19px] font-normal text-ink-soft">{t("Proof of work")}</h3>
              <ProofCapture kind={kind} setKind={setKind} caption={caption} setCaption={setCaption} onFile={addPhoto} />
            </div>
          </div>
        )}

        {st === "done" && (
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-[24px] font-normal tracking-tight">{t("Day complete")}</h2><Chip tone="blue">{t("Waiting for approval")}</Chip></div>
            <Summary s={s} worked={worked} late={late} />
            <p className="mt-4 text-[15px] text-ink-soft">{t("{name} will review your hours and photos. You will be notified.", { name: t(contractor.company) })}</p>
          </div>
        )}

        {st === "approved" && s.decision && (
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-[24px] font-normal tracking-tight">{t("Approved")}</h2><Chip tone="green">{t(s.decision.mark === "P" ? "Present" : s.decision.mark === "H" ? "Half day" : "Absent")}</Chip></div>
            <Summary s={s} worked={worked} late={late} />
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-ok-bg p-5 text-ok-fg">
              <div><div className="text-sm">{t("Added to your payouts")}</div><div className="text-3xl tabular-nums">{formatINR(amountFor(s.decision.mark))}</div></div>
              <Button variant="primary" href="/worker/payouts" icon={<ArrowRight size={17} />} className="flex-row-reverse">{t("Open payouts")}</Button>
            </div>
            {s.decision.note && <p className="mt-3 text-sm text-ink-soft">“{s.decision.note}” — {t(contractor.name)}</p>}
          </div>
        )}

        {st === "disputed" && s.dispute && (
          <div>
            <h2 className="text-[24px] font-normal tracking-tight">{t("The contractor has a question")}</h2>
            <p className="mt-3 rounded-2xl bg-bad-bg p-4 text-[15px] text-bad-fg">“{s.dispute.reason}”</p>
            <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-12">
              <div className="lg:col-span-6">
                <Field label="Your reply" htmlFor="rep"><Textarea id="rep" value={reply} onChange={(e) => setReply(e.target.value)} maxLength={300} placeholder={t("Explain what happened")} /></Field>
                <Button variant="primary" className="mt-4" icon={<Send size={16} />} disabled={reply.trim().length < 5} onClick={() => { worker.resubmit(job, reply.trim()); setReply(""); toast(t("Reply sent")); }}>{t("Send reply")}</Button>
              </div>
              <div className="lg:col-span-6"><h3 className="mb-2 text-[17px] text-ink-soft">{t("Add more proof")}</h3><ProofCapture kind={kind} setKind={setKind} caption={caption} setCaption={setCaption} onFile={addPhoto} /></div>
            </div>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <Card className="lg:col-span-7">
          <CardHeader title="Photos from today" subtitle={tn(t, s.proofs.length, "{n} photo", "{n} photos")} />
          <div className="px-4 pb-6 md:px-8 md:pb-8"><ProofGrid proofs={s.proofs} jobTitle={job.title} onRemove={editable ? (id) => worker.removeProof(job, id) : undefined} /></div>
        </Card>
        <Card className="lg:col-span-5">
          <CardHeader title="Timeline" />
          <div className="px-6 pb-6 md:px-8 md:pb-8"><ShiftTimeline shift={s} lateMin={late} /></div>
        </Card>
      </div>

      <Card className="p-6 md:p-8">
        <h2 className="text-[22px] font-normal tracking-tight text-ink-soft">{t("Your job journey")}</h2>
        <LifecycleStepper steps={journey} label="Your job journey" className="mt-5" />
        {st === "approved" && <p className="mt-4 text-sm text-ink-mute">{t("After payment you confirm you received it, then you and the contractor review each other.")}</p>}
      </Card>

      {upcoming.length > 0 && (
        <Card><CardHeader title="Coming up" /><ul className="space-y-2 px-4 pb-6 md:px-8">{upcoming.map((j) => (
          <li key={j.id} className="flex items-center gap-3 rounded-2xl bg-canvas p-3"><SkillIcon skill={j.skill} size={44} /><div className="min-w-0 flex-1"><div className="truncate">{t(j.title)}</div><div className="text-xs text-ink-mute tabular-nums">{t(j.area)} · {formatShort(j.startDate)} · {t("Report by")} {reportTimeOf(j)}</div></div></li>))}</ul></Card>
      )}

      <Modal open={finishOpen} onClose={() => setFinishOpen(false)} title="Finish the day"
        footer={<><Button onClick={() => setFinishOpen(false)}>{t("Cancel")}</Button><Button variant="primary" onClick={() => { worker.checkOut(job, note.trim()); setFinishOpen(false); setNote(""); toast(t("Checked out. Sent to the contractor for approval.")); }}>{t("Check out")}</Button></>}>
        <Summary s={{ ...s, checkOutAt: now }} worked={worked} late={late} />
        <div className="mt-5"><Field label="Note for the contractor (optional)" htmlFor="note"><Textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder={t("e.g. Finished the east wall")} /></Field></div>
        <p className="mt-4 text-sm text-ink-mute">{t("You cannot change your hours after checking out.")}</p>
      </Modal>
    </div>
  );
}

function Summary({ s, worked, late }: { s: Shift; worked: number; late: number }) {
  const t = useT();
  const now = useNow();
  const items = [
    ["Checked in", s.checkInAt ? fmtClock(s.checkInAt) : "—"], ["Checked out", s.checkOutAt ? fmtClock(s.checkOutAt) : "—"],
    ["Time worked", fmtDur(worked)], ["Breaks", fmtDur(breakMs(s, now))], ["Photos", String(s.proofs.length)], ["Late by", late ? `${late} min` : t("On time")],
  ];
  return (
    <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
      {items.map(([k, v]) => <div key={k} className="rounded-2xl bg-canvas p-3"><dt className="text-xs text-ink-mute">{t(k)}</dt><dd className="text-lg tabular-nums">{v}</dd></div>)}
    </dl>
  );
}

function ProofCapture({ kind, setKind, caption, setCaption, onFile }: {
  kind: ProofPhoto["kind"]; setKind: (k: ProofPhoto["kind"]) => void; caption: string; setCaption: (s: string) => void;
  onFile: (f: File[]) => void;
}) {
  const t = useT();
  return (
    <div className="mt-3 space-y-3 rounded-2xl bg-canvas p-4">
      <Segmented<ProofPhoto["kind"]> label="Photo type" value={kind} onChange={setKind} options={KINDS} />
      <input value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={80} aria-label={t("Caption (optional)")} placeholder={t("Caption (optional)")}
        className="min-h-11 w-full rounded-2xl border border-transparent bg-white px-4 text-sm placeholder:text-ink-mute" />
      <div className="flex flex-wrap gap-2">
        <label className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-full bg-ink px-5 text-sm text-white focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ink hover:bg-accent-hover">
          <Camera size={16} />{t("Take or choose photo")}
          <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e: ChangeEvent<HTMLInputElement>) => { const fs = Array.from(e.target.files ?? []); if (fs.length) onFile(fs); e.target.value = ""; }} />
        </label>
      </div>
    </div>
  );
}

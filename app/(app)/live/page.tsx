"use client";
import { AlarmClock, Check, CheckCheck, Eye, HelpCircle, Phone, Radio } from "lucide-react";
import { workerHref } from "@/lib/links";
import { useMemo, useState } from "react";
import type { Job, Shift } from "@/data/types";
import { workerById } from "@/data/workers";
import { ProofGrid, ShiftChip, ShiftTimeline } from "@/components/live/ShiftParts";
import { WorkerCell } from "@/components/shared/ApplicantParts";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Drawer } from "@/components/ui/Drawer";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field, Textarea } from "@/components/ui/Fields";
import { StatCard } from "@/components/ui/PageHeader";
import { SkillIcon } from "@/components/ui/SkillIcon";
import { useToast } from "@/components/ui/Toast";
import { TODAY, formatDate, formatINR } from "@/lib/format";
import { useNow } from "@/lib/live";
import { tn, useT } from "@/lib/i18n";
import { fmtClock, fmtDur, MIN, reportAt, shiftHoursOf } from "@/lib/time";
import { bucketOf, breakMs, isOverdue, lateMinutes, suggestMark, workedMs } from "@/lib/shifts";
import { earnedFor, useStore } from "@/lib/store";
import { isLive } from "@/lib/worker";
import { PageHeader } from "@/components/ui/PageHeader";

export default function LiveSitePage() {
  const t = useT();
  const toast = useToast();
  const now = useNow();
  const { jobs, acceptedWorkers, shiftOf, approveShift } = useStore();
  const [open, setOpen] = useState<{ job: Job; workerId: string } | null>(null);

  const active = useMemo(() => jobs.filter((j) => isLive(j) && j.startDate <= TODAY && j.endDate >= TODAY && acceptedWorkers(j.id).length > 0), [jobs, acceptedWorkers]);
  const rows = active.flatMap((job) => acceptedWorkers(job.id).map((workerId) => ({ job, workerId, shift: shiftOf(job, workerId) })));
  const count = (b: ReturnType<typeof bucketOf>) => rows.filter((r) => bucketOf(r.shift.status) === b).length;
  const waiting = rows.filter((r) => r.shift.status === "done");

  const approveAll = () => {
    waiting.forEach((r) => approveShift(r.job, r.workerId, suggestMark(r.job, r.shift)));
    toast(t("{n} shifts approved", { n: waiting.length }));
  };

  return (
    <div>
      <PageHeader title="Live Site" subtitle={`${formatDate(TODAY)} · ${fmtClock(now)}`}
        action={waiting.length > 0 ? <Button variant="light" icon={<CheckCheck size={18} />} onClick={approveAll}>{t("Approve all finished ({n})", { n: waiting.length })}</Button> : undefined} />

      <div className="grid grid-cols-2 gap-5 xl:grid-cols-4">
        <StatCard label="Not started" value={count("notStarted")} tone="slate" icon={<AlarmClock size={22} strokeWidth={1.6} />} hint={rows.filter((r) => isOverdue(r.job, r.shift, now)).length ? t("{n} late to start", { n: rows.filter((r) => isOverdue(r.job, r.shift, now)).length }) : undefined} />
        <StatCard label="On the way" value={count("onTheWay")} tone="amber" icon={<Radio size={22} strokeWidth={1.6} />}  />
        <StatCard label="On site" value={count("onSite")} tone="green" icon={<Check size={22} strokeWidth={1.6} />} />
        <StatCard label="Finished" value={count("finished")} tone="blue" icon={<CheckCheck size={22} strokeWidth={1.6} />} hint={waiting.length ? t("{n} waiting for your approval", { n: waiting.length }) : undefined} />
      </div>

      <div className="mt-5 space-y-5">
        {active.length === 0 && <Card><EmptyState icon={<Radio size={24} />} title="No one is scheduled today" body="When workers you accepted have a job starting today, you can follow their day here live." action={<Button variant="primary" href="/jobs">{t("Open Jobs")}</Button>} /></Card>}
        {active.map((job) => {
          const ws = acceptedWorkers(job.id);
          const shifts = ws.map((w) => ({ w, s: shiftOf(job, w) }));
          const onSite = shifts.filter((x) => bucketOf(x.s.status) === "onSite" || bucketOf(x.s.status) === "finished").length;
          return (
            <Card key={job.id}>
              <div className="flex flex-wrap items-center justify-between gap-4 px-6 pb-4 pt-6 md:px-8 md:pt-8">
                <div className="flex items-center gap-4"><SkillIcon skill={job.skill} size={52} /><div><h2 className="text-[22px] font-normal tracking-tight">{t(job.title)}</h2><p className="text-sm text-ink-mute tabular-nums">{t(job.area)} · {t("Report by")} {fmtClock(reportAt(job))}</p></div></div>
                <Chip tone="slate">{t("{a} of {b} on site", { a: onSite, b: ws.length })}</Chip>
              </div>
              <div className="px-4 pb-6 md:px-8 md:pb-8">
                <ul className="space-y-2">
                  {shifts.map(({ w, s }) => <WorkerRow key={w} job={job} workerId={w} s={s} now={now} onOpen={() => setOpen({ job, workerId: w })} />)}
                </ul>
              </div>
            </Card>
          );
        })}
      </div>

      <ShiftDrawer ctx={open} onClose={() => setOpen(null)} />
    </div>
  );
}

function WorkerRow({ job, workerId, s, now, onOpen }: { job: Job; workerId: string; s: Shift; now: number; onOpen: () => void }) {
  const t = useT();
  const overdue = isOverdue(job, s, now);
  const late = s.lateMin ?? lateMinutes(job, s);
  const detail = (() => {
    switch (s.status) {
      case "scheduled": return overdue ? t("{n} min past reporting time", { n: Math.floor((now - reportAt(job)) / MIN) }) : t("Expected by {time}", { time: fmtClock(reportAt(job)) });
      case "on_the_way": return t("On the way for {d}", { d: fmtDur(Math.max(now - (s.journeyAt ?? now), 0)) });
      case "arrived": return t("Arrived at {time}", { time: fmtClock(s.arrivedAt ?? now) });
      case "working": return `${t("Working")} ${fmtDur(workedMs(s, now))} · ${t("since {time}", { time: fmtClock(s.checkInAt ?? now) })}`;
      case "break": return t("On break · {d} so far", { d: fmtDur(breakMs(s, now)) });
      case "done": return `${t("Worked {d}", { d: fmtDur(workedMs(s, now)) })} · ${tn(t, s.proofs.length, "{n} photo", "{n} photos")}`;
      case "approved": return `${t("Approved")} · ${t(s.decision?.mark === "P" ? "Present" : s.decision?.mark === "H" ? "Half day" : "Absent")} · ${s.decision?.hours}h`;
      case "disputed": return s.dispute?.reply ? t("Worker replied") : t("Waiting for the worker's reply");
    }
  })();
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl bg-canvas p-3 md:p-4">
      <div className="min-w-0 flex-1 basis-48"><WorkerCell workerId={workerId} href={workerHref(workerId)} sub={detail} /></div>
      <div className="flex flex-wrap items-center gap-2">
        {late > 0 && s.checkInAt !== undefined && <Chip tone="red"><AlarmClock size={12} className="mr-0.5 inline" />{t("{n} min late", { n: late })}</Chip>}
        <ShiftChip status={s.status} overdue={overdue} />
        {overdue && <Button size="sm" variant="dark" href={`tel:${workerById(workerId).phone.replace(/\s/g, "")}`} icon={<Phone size={14} />}>{t("Call")}</Button>}
        <Button size="sm" variant={s.status === "done" || (s.status === "disputed" && s.dispute?.reply) ? "primary" : "secondary"} icon={s.status === "done" ? <Check size={15} /> : <Eye size={15} />} onClick={onOpen}>
          {s.status === "done" || (s.status === "disputed" && s.dispute?.reply) ? t("Review and approve") : t("View")}
        </Button>
      </div>
    </li>
  );
}

function ShiftDrawer({ ctx, onClose }: { ctx: { job: Job; workerId: string } | null; onClose: () => void }) {
  const t = useT();
  const toast = useToast();
  const now = useNow();
  const { shiftOf, approveShift, disputeShift } = useStore();
  const [ask, setAsk] = useState(false);
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const close = () => { setAsk(false); setReason(""); setNote(""); onClose(); };
  if (!ctx) return <Drawer open={false} onClose={close} title="">{null}</Drawer>;
  const { job, workerId } = ctx;
  const w = workerById(workerId);
  const s = shiftOf(job, workerId);
  const late = s.lateMin ?? lateMinutes(job, s);
  const suggested = suggestMark(job, s);
  const decide = (mark: "P" | "H" | "A") => { approveShift(job, workerId, mark, note.trim() || undefined); toast(t("Shift approved. Attendance and payroll updated.")); close(); };
  const can = s.status === "done" || s.status === "disputed";
  const worked = workedMs(s, now);
  const label = (m: "P" | "H" | "A") => t(m === "P" ? "Present" : m === "H" ? "Half day" : "Absent");

  return (
    <Drawer open onClose={close} title={t(w.name)}>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3"><div className="text-sm text-ink-mute">{t(job.title)} · {t(job.area)}</div><ShiftChip status={s.status} /></div>
        <dl className="grid grid-cols-2 gap-3">
          {[["Checked in", s.checkInAt ? fmtClock(s.checkInAt) : "—"], ["Checked out", s.checkOutAt ? fmtClock(s.checkOutAt) : "—"], ["Time worked", fmtDur(worked)], ["Breaks", fmtDur(breakMs(s, now))], ["Photos", String(s.proofs.length)], ["Late by", late ? `${late} min` : t("On time")]].map(([k, v]) => (
            <div key={k} className="rounded-2xl bg-canvas p-3"><dt className="text-xs text-ink-mute">{t(k)}</dt><dd className="text-lg tabular-nums">{v}</dd></div>
          ))}
        </dl>
        {s.workerNote && <p className="rounded-2xl bg-canvas p-4 text-[15px] text-ink-soft">“{s.workerNote}”<span className="mt-1 block text-xs text-ink-mute">{t(w.name)}</span></p>}

        <section><h3 className="mb-3 text-[17px] text-ink-soft">{t("Proof of work")}</h3><ProofGrid proofs={s.proofs} jobTitle={job.title} cols="grid-cols-2" /></section>
        <section><h3 className="mb-3 text-[17px] text-ink-soft">{t("Timeline")}</h3><ShiftTimeline shift={s} lateMin={late} /></section>

        {s.status === "disputed" && s.dispute && (
          <section className="rounded-2xl bg-bad-bg p-4 text-sm text-bad-fg"><div className="font-medium">{t("Your question")}</div><p className="mt-1">“{s.dispute.reason}”</p>{s.dispute.reply ? <p className="mt-3 rounded-xl bg-white p-3 text-ink-soft"><span className="block text-xs text-ink-mute">{t("Worker's reply")}</span>{s.dispute.reply}</p> : <p className="mt-2 text-xs">{t("Waiting for the worker's reply")}</p>}</section>
        )}

        {can && !ask && (
          <section className="space-y-3 rounded-2xl border border-line p-4">
            <div className="text-[17px]">{t("Your decision")}</div>
            <p className="text-sm text-ink-mute">{t("Suggested: {mark} ({h} hours worked)", { mark: label(suggested), h: (worked / 3_600_000).toFixed(1) })}</p>
            <Field label="Note for the worker (optional)" htmlFor="dn"><Textarea id="dn" value={note} onChange={(e) => setNote(e.target.value)} maxLength={160} className="!min-h-[72px]" /></Field>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {(["P", "H", "A"] as const).map((m) => (
                <Button key={m} variant={m === suggested ? "primary" : "secondary"} onClick={() => decide(m)}>{label(m)} · {formatINR(earnedFor(job, m === "P" ? 1 : m === "H" ? 0.5 : 0))}</Button>
              ))}
            </div>
            <Button variant="ghost" icon={<HelpCircle size={16} />} onClick={() => setAsk(true)}>{t("Ask the worker a question")}</Button>
          </section>
        )}
        {can && ask && (
          <section className="space-y-3 rounded-2xl border border-line p-4">
            <Field label="What would you like to ask?" htmlFor="dq" error={reason.length > 0 && reason.trim().length < 10 ? "Please write at least 10 characters" : undefined}>
              <Textarea id="dq" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={240} placeholder={t("e.g. The photos do not show the east wall")} />
            </Field>
            <div className="flex gap-2"><Button onClick={() => setAsk(false)}>{t("Back")}</Button><Button variant="primary" disabled={reason.trim().length < 10} onClick={() => { disputeShift(job, workerId, reason.trim()); toast(t("Question sent to {name}", { name: t(w.name) })); close(); }}>{t("Send question")}</Button></div>
          </section>
        )}
        {!can && s.status !== "approved" && <p className="rounded-2xl bg-canvas p-4 text-sm text-ink-mute">{t("You can approve once {name} checks out.", { name: t(w.name.split(" ")[0]) })}</p>}
        {s.status === "approved" && s.decision && (
          <section className="rounded-2xl bg-ok-bg p-4 text-ok-fg"><div className="text-lg">{t("Approved")} · {label(s.decision.mark)}</div><div className="text-sm">{s.decision.hours} h · {formatINR(earnedFor(job, s.decision.mark === "P" ? 1 : s.decision.mark === "H" ? 0.5 : 0))}</div></section>
        )}
        <span className="sr-only">{shiftHoursOf(job)}</span>
      </div>
    </Drawer>
  );
}

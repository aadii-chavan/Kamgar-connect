"use client";
import { CalendarDays, Clock, MapPin, Minus, Plus, Users } from "lucide-react";
import { jobHref } from "@/lib/links";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { SKILLS } from "@/data/jobs";
import type { PayType } from "@/data/types";
import { TODAY, addDays, daysInclusive, formatDate, formatINR, rateLabel } from "@/lib/format";
import { useT, tn } from "@/lib/i18n";
import { estimateTotal, useStore } from "@/lib/store";
import { HOUR, MIN, dayStart, fmtClock } from "@/lib/time";
import { wageVerdict } from "@/lib/wages";
import { AmenityChips } from "@/components/site/AmenityChips";
import { SiteModal } from "@/components/site/SiteModal";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Field, Input, Select } from "@/components/ui/Fields";
import { PageHeader } from "@/components/ui/PageHeader";
import { Segmented } from "@/components/ui/Segmented";
import { SkillIcon } from "@/components/ui/SkillIcon";
import { useToast } from "@/components/ui/Toast";

function Section({ n, title, sub, children }: { n: number; title: string; sub: string; children: React.ReactNode }) {
  const t = useT();
  return (
    <Card>
      <div className="flex items-center gap-4 px-6 pt-6">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-medium text-accent shadow-badge">{n}</span>
        <div><h2 className="text-xl font-normal">{t(title)}</h2><p className="text-sm text-ink-mute">{t(sub)}</p></div>
      </div>
      <div className="grid gap-6 p-6 grid-cols-1 sm:grid-cols-2">{children}</div>
    </Card>
  );
}

export default function PostJobPage() {
  const router = useRouter();
  const toast = useToast();
  const t = useT();
  const { addJob, sites } = useStore();
  const [siteOpen, setSiteOpen] = useState(false);
  const [f, setF] = useState({
    title: "", skill: "", siteId: "", needed: 1, payType: "daily" as PayType,
    amount: "", startDate: addDays(TODAY, 1), endDate: addDays(TODAY, 7), reportTime: "08:00", shiftHours: 8,
  });
  const [submitted, setSubmitted] = useState(false);
  const site = sites.find((x) => x.id === f.siteId);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }));

  const amount = Number(f.amount) || 0;
  const days = daysInclusive(f.startDate, f.endDate);
  const total = estimateTotal(f.payType, amount, f.needed, days);
  const errors = {
    title: !f.title.trim() && "Give the job a short title",
    skill: !f.skill && "Choose the skill you need",
    siteId: !f.siteId && "Choose the work site",
    amount: amount <= 0 && "Enter the pay amount",
    endDate: days === 0 && "End date must be on or after the start date",
  };
  const hasErrors = Object.values(errors).some(Boolean);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (hasErrors) return;
    try {
    const job = await addJob({ title: f.title.trim(), skill: f.skill, area: site!.area, address: site!.address, siteId: site!.id, needed: f.needed, payType: f.payType, amount, startDate: f.startDate, endDate: f.endDate, reportTime: f.reportTime, shiftHours: f.shiftHours });
    toast(t("“{job}” is now live", { job: job.title }));
    router.push(jobHref(job.id));
    } catch (err) { toast(err instanceof Error ? err.message : t("Could not post the job. Please try again.")); }
  };
  const err = (k: keyof typeof errors) => (submitted && errors[k] ? (errors[k] as string) : undefined);
  const wage = f.payType === "daily" ? wageVerdict(f.skill, amount) : null;
  const unit = f.payType === "daily" ? "per day" : f.payType === "hourly" ? "per hour" : "per worker";

  return (
    <div>
      <PageHeader title="Post a Job" subtitle="Workers nearby will see this right away" />
      <div className="grid items-start gap-8 grid-cols-1 lg:grid-cols-5">
        <form onSubmit={submit} noValidate className="space-y-6 lg:col-span-3">
          <Section n={1} title="What do you need?" sub="Describe the work and where it is">
            <div className="sm:col-span-2"><Field label="Job title" htmlFor="title" error={err("title")}>
              <Input id="title" value={f.title} onChange={(e) => set("title", e.target.value)} placeholder={t("e.g. Brick masonry for 2nd floor")} />
            </Field></div>
            <Field label="Skill needed" htmlFor="skill" error={err("skill")}>
              <Select id="skill" value={f.skill} onChange={(e) => set("skill", e.target.value)}>
                <option value="">{t("Select skill")}</option>{SKILLS.map((s) => <option key={s} value={s}>{t(s)}</option>)}
              </Select>
            </Field>
            <Field label="Work site" htmlFor="site" error={err("siteId")}>
              <Select id="site" value={f.siteId} onChange={(e) => set("siteId", e.target.value)}>
                <option value="">{t("Select a site")}</option>{sites.map((x) => <option key={x.id} value={x.id}>{x.name} · {t(x.area)}</option>)}
              </Select>
            </Field>
            <div className="sm:col-span-2">
              {site ? (
                <div className="rounded-2xl bg-canvas p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0"><div className="text-[15px] text-ink">{site.name}</div><div className="text-xs text-ink-mute">{t(site.address)}</div></div>
                    <Button size="sm" variant="ghost" onClick={() => setSiteOpen(true)}>{t("Add another site")}</Button>
                  </div>
                  <AmenityChips amenities={site.amenities} className="mt-3" />
                  <p className="mt-3 text-xs text-ink-mute">{t("Workers see these amenities and get the full address once you accept them.")}</p>
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-canvas p-4">
                  <p className="text-sm text-ink-soft">{sites.length === 0 ? t("Add the site where the work will happen. Workers trust jobs with a clear site.") : t("Choose where the work will happen, or add a new site.")}</p>
                  <Button size="sm" variant="primary" icon={<Plus size={15} />} onClick={() => setSiteOpen(true)}>{t("Add a site")}</Button>
                </div>
              )}
            </div>
          </Section>

          <Section n={2} title="Team and pay" sub="How many people, and what you will pay">
            <Field label="Workers needed">
              <div className="inline-flex items-center rounded-xl border border-line bg-canvas/60">
                <button type="button" aria-label={t("Fewer workers")} disabled={f.needed <= 1} onClick={() => set("needed", f.needed - 1)} className="flex h-11 w-12 items-center justify-center rounded-l-xl text-ink-soft hover:bg-black/5 disabled:opacity-40"><Minus size={16} /></button>
                <output aria-live="polite" className="w-12 text-center text-lg font-medium tabular-nums">{f.needed}</output>
                <button type="button" aria-label={t("More workers")} disabled={f.needed >= 50} onClick={() => set("needed", f.needed + 1)} className="flex h-11 w-12 items-center justify-center rounded-r-xl text-ink-soft hover:bg-black/5 disabled:opacity-40"><Plus size={16} /></button>
              </div>
            </Field>
            <Field label="Pay type">
              <Segmented<PayType> label="Pay type" value={f.payType} onChange={(v) => set("payType", v)} options={[{ id: "daily", label: "Daily" }, { id: "hourly", label: "Hourly" }, { id: "fixed", label: "Fixed" }]} />
            </Field>
            <Field label={t("Amount (₹ {unit})", { unit: t(unit) })} htmlFor="amount" error={err("amount")}>
              <div className="relative">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 font-medium text-ink-mute">₹</span>
                <Input id="amount" type="number" inputMode="numeric" min={0} value={f.amount} onChange={(e) => set("amount", e.target.value)} placeholder="800" className="pl-8 tabular-nums" />
              </div>
              {wage && (
                <p className={`mt-2 text-xs ${wage.verdict === "low" ? "text-warn-fg" : wage.verdict === "high" ? "text-ok-fg" : "text-ink-mute"}`} role="status">
                  {t("Suggested pay for {skill}: ₹{lo}–₹{hi} per day.", { skill: t(f.skill), lo: wage.range[0], hi: wage.range[1] })}{" "}
                  {wage.verdict === "low" ? t("Your offer is below this, so fewer workers may apply.") : wage.verdict === "high" ? t("Your offer is above this. You should fill the job quickly.") : t("Your offer is fair.")}
                </p>
              )}
            </Field>
          </Section>

          <Section n={3} title="Schedule" sub="When should the work run?">
            <Field label="Start date" htmlFor="start"><Input id="start" type="date" value={f.startDate} onChange={(e) => set("startDate", e.target.value)} /></Field>
            <Field label="End date" htmlFor="end" error={err("endDate")}><Input id="end" type="date" min={f.startDate} value={f.endDate} onChange={(e) => set("endDate", e.target.value)} /></Field>
            <Field label="Report on site by" htmlFor="rt" hint="Workers see this time and are marked late after it">
              <Select id="rt" value={f.reportTime} onChange={(e) => set("reportTime", e.target.value)}>
                {["06:00", "06:30", "07:00", "07:30", "08:00", "08:30", "09:00", "09:30", "10:00"].map((x) => <option key={x} value={x}>{fmtClock(dayStart() + Number(x.slice(0, 2)) * HOUR + Number(x.slice(3)) * MIN)}</option>)}
              </Select>
            </Field>
            <Field label="Working hours per day" htmlFor="sh">
              <Select id="sh" value={String(f.shiftHours)} onChange={(e) => set("shiftHours", Number(e.target.value))}>
                {[4, 5, 6, 7, 8, 9, 10].map((h) => <option key={h} value={h}>{h} {t("hours")}</option>)}
              </Select>
            </Field>
          </Section>

          <div className="flex justify-end gap-3">
            <Button href="/jobs">{t("Cancel")}</Button>
            <Button type="submit" variant="primary">{t("Post Job")}</Button>
          </div>
        </form>

        <aside className="lg:sticky lg:top-24 lg:col-span-2" aria-label="Live preview">
          <div className="mb-3 flex items-center gap-2 text-sm text-white/85">
            <span className="h-2 w-2 animate-pulse rounded-full bg-[#FFC857]" />{t("Live preview")}
          </div>
          <Card>
            <div className="p-5 sm:p-6">
              <div className="holo relative rounded-3xl p-5 text-white shadow-lift">
                <div className="flex items-start justify-between">
                  <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/25 backdrop-blur"><SkillIcon skill={f.skill || "—"} size={34} className="!shadow-none" /></span>
                  <span className="text-xl font-semibold italic tracking-wide">KAMGAR</span>
                </div>
                <div className="mt-5 text-right text-[30px] font-medium leading-none tabular-nums">{amount > 0 ? rateLabel({ payType: f.payType, amount }) : "₹—"}</div>
                <div className="mt-6 flex items-end justify-between gap-3">
                  <div className="min-w-0">
                    <div className={`truncate text-lg ${f.title ? "" : "text-white/70"}`}>{f.title || t("Your job title")}</div>
                    <div className="truncate text-sm text-white/85">{f.skill ? t(f.skill) : t("Skill needed")} · {site ? t(site.area) : t("Area")}</div>
                  </div>
                  <Chip tone="blue">{t("Open")}</Chip>
                </div>
              </div>
              <ul className="mt-5 space-y-3 px-1 text-sm text-ink-soft">
                <li className="flex items-center gap-3"><MapPin size={16} className="text-ink-mute" />{site ? `${site.name}, ${t(site.area)}` : t("Area")}</li>
                <li className="flex items-center gap-3"><Users size={16} className="text-ink-mute" />{tn(t, f.needed, "{n} worker needed", "{n} workers needed")}</li>
                <li className="flex items-center gap-3"><CalendarDays size={16} className="text-ink-mute" /><span className="tabular-nums">{formatDate(f.startDate)} – {formatDate(f.endDate)}</span></li>
                <li className="flex items-center gap-3"><Clock size={16} className="text-ink-mute" /><span className="tabular-nums">{t("Report by")} {fmtClock(dayStart() + Number(f.reportTime.slice(0, 2)) * HOUR + Number(f.reportTime.slice(3)) * MIN)} · {f.shiftHours}h</span></li>
              </ul>
            </div>
            <div className="mint-panel rounded-b-3xl p-6">
              <div className="text-sm text-ink-soft">{t("Estimated total cost")}</div>
              <div className="mt-1 text-[34px] font-normal leading-tight text-ink tabular-nums">{formatINR(total)}</div>
              <div className="mt-1 text-xs text-ink-soft tabular-nums">
                {f.payType === "fixed" ? `${tn(t, f.needed, "{n} worker", "{n} workers")} × ${formatINR(amount)}` : `${tn(t, f.needed, "{n} worker", "{n} workers")} × ${tn(t, days, "{n} day", "{n} days")} × ${f.payType === "hourly" ? `${t("8 hrs")} × ` : ""}${formatINR(amount)}`}
              </div>
            </div>
          </Card>
        </aside>
      </div>
      <SiteModal open={siteOpen} onClose={() => setSiteOpen(false)} onSaved={(x) => set("siteId", x.id)} />
    </div>
  );
}

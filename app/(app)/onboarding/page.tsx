"use client";
import { ArrowLeft, ArrowRight, Check, Minus, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AREAS, SKILLS } from "@/data/jobs";
import type { BusinessKind } from "@/data/types";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, Input, Select, Textarea } from "@/components/ui/Fields";
import { Segmented } from "@/components/ui/Segmented";
import { cn } from "@/components/ui/cn";
import { useToast } from "@/components/ui/Toast";
import { useT } from "@/lib/i18n";
import { useStore } from "@/lib/store";

const STEPS = ["Your business", "What you hire for", "Contact and payouts", "Review"];
const TEAM = ["1-5", "6-20", "21-50", "50+"];
const GST = /^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$/;

export default function ContractorOnboardingPage() {
  const t = useT();
  const router = useRouter();
  const toast = useToast();
  const { contractorProfile: cp, updateContractorProfile } = useStore();
  const [step, setStep] = useState(0);
  const [tried, setTried] = useState(false);
  const [agree, setAgree] = useState(false);
  const [f, setF] = useState({
    ownerName: cp.ownerName, phone: cp.phone, company: cp.company, kind: cp.kind as BusinessKind, yearsInBusiness: cp.yearsInBusiness, teamSize: cp.teamSize, about: cp.about,
    trades: cp.trades, areas: cp.areas, officeAddress: cp.officeAddress, gst: cp.gst, upi: cp.upi, pledge: cp.pledge,
  });
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }));
  const toggle = (k: "trades" | "areas", v: string) => set(k, f[k].includes(v) ? f[k].filter((x) => x !== v) : [...f[k], v]);

  const errors: Record<number, Record<string, string | false>> = {
    0: { ownerName: !f.ownerName.trim() && "Enter your full name", phone: f.phone.replace(/\D/g, "").length !== 10 && "Enter a 10-digit phone number", company: !f.company.trim() && "Enter your business or trade name" },
    1: { trades: f.trades.length === 0 && "Pick at least one trade", areas: f.areas.length === 0 && "Pick at least one area" },
    2: {
      officeAddress: f.officeAddress.trim().length < 8 && "Enter your office or home address",
      gst: !!f.gst.trim() && !GST.test(f.gst.trim().toUpperCase()) && "Enter a valid 15-character GSTIN, or leave it empty",
      upi: !!f.upi.trim() && !/^[\w.\-]{2,}@[A-Za-z]{2,}$/.test(f.upi.trim()) && "Enter a valid UPI ID, like name@upi",
      pledge: !f.pledge && "Please accept the fair-pay pledge to continue",
    },
    3: { agree: !agree && "Please confirm to continue" },
  };
  const stepErrors = Object.entries(errors[step]).filter(([, v]) => v);
  const err = (k: string) => (tried && errors[step][k] ? (errors[step][k] as string) : undefined);

  const next = () => {
    setTried(true);
    if (stepErrors.length) return;
    setTried(false);
    if (step < STEPS.length - 1) { setStep(step + 1); window.scrollTo({ top: 0, behavior: "smooth" }); return; }
    updateContractorProfile((p) => ({ ...p, ...f, ownerName: f.ownerName.trim(), phone: f.phone.replace(/\D/g, ""), company: f.company.trim(), gst: f.gst.trim().toUpperCase(), upi: f.upi.trim(), officeAddress: f.officeAddress.trim(), onboarded: true }));
    toast(t("Your business is registered. Add your sites to earn workers' trust."));
    router.replace("/profile");
  };

  const Chips = ({ list, k }: { list: string[]; k: "trades" | "areas" }) => (
    <div className="flex flex-wrap gap-2">
      {list.map((s) => (
        <button key={s} type="button" aria-pressed={f[k].includes(s)} onClick={() => toggle(k, s)}
          className={cn("min-h-11 rounded-full px-4 text-sm transition-colors", f[k].includes(s) ? "bg-ink text-white" : "bg-canvas text-ink-soft hover:bg-accent-tint")}>{t(s)}</button>
      ))}
    </div>
  );

  return (
    <div className="mx-auto max-w-[860px]">
      <div className="on-dark pt-4 md:pt-10">
        <p className="text-lg text-white/85">{t("Takes about 3 minutes. You can add your sites right after.")}</p>
        <h1 className="mt-5 text-[40px] font-medium leading-[1] tracking-[-0.04em] text-white md:text-[68px]">{t("Set up your business")}</h1>
      </div>

      <ol className="mt-8 grid grid-cols-4 gap-2 md:mt-10" aria-label={t("Progress")}>
        {STEPS.map((s, i) => (
          <li key={s} aria-current={i === step ? "step" : undefined} className="min-w-0">
            <div className={cn("h-1.5 rounded-full", i <= step ? "bg-white" : "bg-white/30")} />
            <div className={cn("mt-2 flex items-center gap-1.5 truncate text-[13px] md:text-sm", i <= step ? "text-white" : "text-white/65")}>
              <span className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px]", i < step ? "bg-white text-ink" : "border border-current")}>{i < step ? <Check size={12} /> : i + 1}</span>
              <span className="truncate max-sm:hidden">{t(s)}</span>
            </div>
          </li>
        ))}
      </ol>

      <Card className="mt-6 p-6 md:p-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[26px] font-normal tracking-tight">{t(STEPS[step])}</h2>
        </div>

        {step === 0 && (
          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
            <Field label="Your name" htmlFor="owner" error={err("ownerName")}>
              <Input id="owner" value={f.ownerName} onChange={(e) => set("ownerName", e.target.value)} autoComplete="name" />
            </Field>
            <Field label="Phone number" htmlFor="phone" error={err("phone")}>
              <Input id="phone" value={f.phone} onChange={(e) => set("phone", e.target.value)} inputMode="tel" autoComplete="tel" className="tabular-nums" />
            </Field>
            <div className="sm:col-span-2"><Field label="Business or trade name" htmlFor="company" error={err("company")}>
              <Input id="company" value={f.company} onChange={(e) => set("company", e.target.value)} placeholder={t("e.g. Sharma Constructions")} />
            </Field></div>
            <Field label="Type of business">
              <Segmented<BusinessKind> label="Type of business" value={f.kind} onChange={(v) => set("kind", v)} options={[{ id: "individual", label: "Individual" }, { id: "firm", label: "Firm" }, { id: "company", label: "Company" }]} />
            </Field>
            <Field label="Years in business">
              <div className="inline-flex items-center rounded-2xl bg-canvas">
                <button type="button" aria-label={t("Fewer years")} disabled={f.yearsInBusiness <= 0} onClick={() => set("yearsInBusiness", f.yearsInBusiness - 1)} className="flex h-12 w-12 items-center justify-center rounded-l-2xl text-ink-soft hover:bg-black/5 disabled:opacity-40"><Minus size={16} /></button>
                <output aria-live="polite" className="w-14 text-center text-lg tabular-nums">{f.yearsInBusiness}</output>
                <button type="button" aria-label={t("More years")} disabled={f.yearsInBusiness >= 60} onClick={() => set("yearsInBusiness", f.yearsInBusiness + 1)} className="flex h-12 w-12 items-center justify-center rounded-r-2xl text-ink-soft hover:bg-black/5 disabled:opacity-40"><Plus size={16} /></button>
              </div>
            </Field>
            <Field label="Workers you usually hire" htmlFor="team">
              <Select id="team" value={f.teamSize} onChange={(e) => set("teamSize", e.target.value)}>{TEAM.map((x) => <option key={x} value={x}>{x}</option>)}</Select>
            </Field>
            <div className="sm:col-span-2"><Field label="About your business (optional)" htmlFor="about" hint="Workers read this before they apply">
              <Textarea id="about" value={f.about} onChange={(e) => set("about", e.target.value)} maxLength={280} placeholder={t("What kind of work do you do, and how do you treat your team?")} />
            </Field></div>
          </div>
        )}

        {step === 1 && (
          <div className="mt-6 space-y-6">
            <Field label="Trades you hire for" error={err("trades")}><Chips list={SKILLS} k="trades" /></Field>
            <Field label="Areas you work in" error={err("areas")}><Chips list={AREAS} k="areas" /></Field>
          </div>
        )}

        {step === 2 && (
          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="sm:col-span-2"><Field label="Office or home address" htmlFor="addr" error={err("officeAddress")}>
              <Input id="addr" value={f.officeAddress} onChange={(e) => set("officeAddress", e.target.value)} placeholder={t("Shop / building, street, area")} />
            </Field></div>
            <Field label="GSTIN (optional)" htmlFor="gst" error={err("gst")} hint="15 characters. Adds trust, but not required.">
              <Input id="gst" value={f.gst} onChange={(e) => set("gst", e.target.value)} maxLength={15} autoCapitalize="characters" className="tabular-nums" placeholder="27ABCDE1234F1Z5" />
            </Field>
            <Field label="UPI ID (optional)" htmlFor="upi" error={err("upi")} hint="Used to pay workers. You can add it later.">
              <Input id="upi" value={f.upi} onChange={(e) => set("upi", e.target.value)} autoCapitalize="none" placeholder="name@upi" />
            </Field>
            <div className="rounded-2xl bg-canvas p-5 sm:col-span-2">
              <div className="text-[17px] text-ink">{t("Fair-pay pledge")}</div>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink-soft">
                <li>{t("Pay the agreed wage, on the day the work is approved.")}</li>
                <li>{t("Give drinking water, a toilet and safety gear on every site.")}</li>
                <li>{t("Treat every worker with respect and settle disputes fairly.")}</li>
              </ul>
              <label className="mt-4 flex cursor-pointer items-start gap-3 text-[15px] text-ink-soft">
                <input type="checkbox" checked={f.pledge} onChange={(e) => set("pledge", e.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-[#15110E]" />
                <span>{t("I accept the fair-pay pledge.")}</span>
              </label>
              {err("pledge") && <p className="mt-2 text-xs font-medium text-bad-fg">{t(err("pledge")!)}</p>}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="mt-6">
            <dl className="divide-y divide-line rounded-2xl bg-canvas">
              {([
                ["Your name", f.ownerName], ["Phone", f.phone], ["Business", f.company], ["Type of business", t(f.kind === "individual" ? "Individual" : f.kind === "firm" ? "Firm" : "Company")],
                ["Years in business", String(f.yearsInBusiness)], ["Trades", f.trades.map((x) => t(x)).join(", ")], ["Areas", f.areas.map((x) => t(x)).join(", ")],
                ["Office or home address", f.officeAddress], ["GSTIN", f.gst || "—"], ["UPI ID", f.upi || "—"],
              ] as const).map(([k, v]) => <div key={k} className="flex justify-between gap-6 px-5 py-3 text-[15px]"><dt className="text-ink-mute">{t(k)}</dt><dd className="text-right tabular-nums">{v}</dd></div>)}
            </dl>
            <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-2xl p-2 text-[15px] text-ink-soft">
              <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-[#15110E]" />
              <span>{t("I confirm these details are correct and I agree to the Kamgar terms.")}</span>
            </label>
            {err("agree") && <p className="mt-1 px-2 text-xs font-medium text-bad-fg">{t(err("agree")!)}</p>}
          </div>
        )}

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
          <Button variant="ghost" onClick={() => { setTried(false); setStep(step - 1); }} disabled={step === 0} icon={<ArrowLeft size={18} />}>{t("Back")}</Button>
          <Button variant="primary" onClick={next} icon={step === STEPS.length - 1 ? <Check size={18} /> : <ArrowRight size={18} />} className="min-w-[220px] flex-row-reverse">
            {step === STEPS.length - 1 ? t("Register my business") : t("Continue")}
          </Button>
        </div>
      </Card>
    </div>
  );
}

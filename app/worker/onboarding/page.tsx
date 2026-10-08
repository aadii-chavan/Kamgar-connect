"use client";
import { ArrowLeft, ArrowRight, Check, Minus, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AREAS, SKILLS, CITY } from "@/data/jobs";
import type { Availability } from "@/data/types";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, Input, Select, Textarea } from "@/components/ui/Fields";
import { Segmented } from "@/components/ui/Segmented";
import { cn } from "@/components/ui/cn";
import { useToast } from "@/components/ui/Toast";
import { useT } from "@/lib/i18n";
import { useStore } from "@/lib/store";

const LANGUAGES = ["Marathi", "Hindi", "English", "Urdu"];
const STEPS = ["About you", "Your work", "Contact and payouts", "Review"];
const YEARS = Array.from({ length: 50 }, (_, i) => new Date().getFullYear() - 18 - i);
const digits = (s: string) => s.replace(/\D/g, "");

export default function OnboardingPage() {
  const t = useT();
  const router = useRouter();
  const toast = useToast();
  const { profile, updateProfile } = useStore();
  const [step, setStep] = useState(0);
  const [tried, setTried] = useState(false);
  const [agree, setAgree] = useState(false);
  const [f, setF] = useState({
    name: profile.name, phone: profile.phone, birthYear: profile.birthYear ? String(profile.birthYear) : "", area: profile.area, nativePlace: profile.nativePlace,
    skill: profile.skill, otherSkills: profile.otherSkills, experience: profile.experience, languages: profile.languages,
    rate: profile.rate ? String(profile.rate) : "", availability: profile.availability as Availability, about: profile.about,
    emergencyName: profile.emergencyName, emergencyPhone: profile.emergencyPhone, upi: profile.upi,
  });
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }));
  const toggle = (k: "otherSkills" | "languages", v: string) => set(k, f[k].includes(v) ? f[k].filter((x) => x !== v) : [...f[k], v]);

  const errors: Record<number, Record<string, string | false>> = {
    0: { name: !f.name.trim() && "Enter your full name", phone: digits(f.phone).length !== 10 && "Enter a 10-digit phone number", birthYear: !f.birthYear && "Select your year of birth", area: !f.area && "Choose the area you live in" },
    1: {
      skill: !f.skill && "Choose your main skill", languages: f.languages.length === 0 && "Pick at least one language",
      rate: !(Number(f.rate) > 0) && "Enter the daily pay you expect",
    },
    2: {
      emergencyName: !f.emergencyName.trim() && "Enter a name we can call in an emergency",
      emergencyPhone: digits(f.emergencyPhone).length !== 10 && "Enter a 10-digit phone number",
      upi: !!f.upi.trim() && !/^[\w.\-]{2,}@[A-Za-z]{2,}$/.test(f.upi.trim()) && "Enter a valid UPI ID, like name@upi",
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
    updateProfile((p) => ({
      ...p, ...f, name: f.name.trim(), phone: digits(f.phone), onboarded: true, birthYear: Number(f.birthYear), rate: Number(f.rate), emergencyPhone: digits(f.emergencyPhone), upi: f.upi.trim(),
    }));
    toast(t("Your profile is created. Add photos of your work to build trust."));
    router.replace("/worker/profile");
  };

  return (
    <div className="mx-auto max-w-[860px]">
      <div className="on-dark pt-4 md:pt-10">
        <p className="text-lg text-white/85">{t("Takes about 2 minutes. You can add photos of your work after this.")}</p>
        <h1 className="mt-5 text-[40px] font-medium leading-[1] tracking-[-0.04em] text-white md:text-[68px]">{t("Let's set up your profile")}</h1>
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
          <div className="mt-6 grid gap-6 grid-cols-1 sm:grid-cols-2">
            <Field label="Full name" hint="As on your ID." htmlFor="nm" error={err("name")}>
              <Input id="nm" value={f.name} onChange={(e) => set("name", e.target.value)} autoComplete="name" />
            </Field>
            <Field label="Phone number" htmlFor="ph" error={err("phone")}>
              <Input id="ph" value={f.phone} onChange={(e) => set("phone", e.target.value)} inputMode="tel" autoComplete="tel" className="tabular-nums" />
            </Field>
            <Field label="Year of birth" htmlFor="by" error={err("birthYear")}>
              <Select id="by" value={f.birthYear} onChange={(e) => set("birthYear", e.target.value)}>
                <option value="">{t("Select year")}</option>{YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
              </Select>
            </Field>
            <Field label="Area you live in" htmlFor="area" error={err("area")}>
              <Select id="area" value={f.area} onChange={(e) => set("area", e.target.value)}>
                <option value="">{t("Select area")}</option>{AREAS.map((a) => <option key={a} value={a}>{t(a)}</option>)}
              </Select>
            </Field>
            <div className="sm:col-span-2">
              <Field label="Native place (optional)" htmlFor="native" hint="Your village or home town">
                <Input id="native" value={f.nativePlace} onChange={(e) => set("nativePlace", e.target.value)} placeholder={t("e.g. Satara")} />
              </Field>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="mt-6 grid gap-6 grid-cols-1 sm:grid-cols-2">
            <Field label="Main skill" htmlFor="skill" error={err("skill")}>
              <Select id="skill" value={f.skill} onChange={(e) => set("skill", e.target.value)}>
                <option value="">{t("Select skill")}</option>{SKILLS.map((s) => <option key={s} value={s}>{t(s)}</option>)}
              </Select>
            </Field>
            <Field label="Years of experience">
              <div className="inline-flex items-center rounded-2xl bg-canvas">
                <button type="button" aria-label={t("Less experience")} disabled={f.experience <= 0} onClick={() => set("experience", f.experience - 1)} className="flex h-12 w-12 items-center justify-center rounded-l-2xl text-ink-soft hover:bg-black/5 disabled:opacity-40"><Minus size={16} /></button>
                <output aria-live="polite" className="w-14 text-center text-lg tabular-nums">{f.experience}</output>
                <button type="button" aria-label={t("More experience")} disabled={f.experience >= 40} onClick={() => set("experience", f.experience + 1)} className="flex h-12 w-12 items-center justify-center rounded-r-2xl text-ink-soft hover:bg-black/5 disabled:opacity-40"><Plus size={16} /></button>
              </div>
            </Field>
            <div className="sm:col-span-2">
              <Field label="Other skills (optional)">
                <div className="flex flex-wrap gap-2">
                  {SKILLS.filter((s) => s !== f.skill).map((s) => (
                    <button key={s} type="button" aria-pressed={f.otherSkills.includes(s)} onClick={() => toggle("otherSkills", s)}
                      className={cn("min-h-11 rounded-full px-4 text-sm transition-colors", f.otherSkills.includes(s) ? "bg-ink text-white" : "bg-canvas text-ink-soft hover:bg-accent-tint")}>{t(s)}</button>
                  ))}
                </div>
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Languages you speak" error={err("languages")}>
                <div className="flex flex-wrap gap-2">
                  {LANGUAGES.map((l) => (
                    <button key={l} type="button" aria-pressed={f.languages.includes(l)} onClick={() => toggle("languages", l)}
                      className={cn("min-h-11 rounded-full px-4 text-sm transition-colors", f.languages.includes(l) ? "bg-ink text-white" : "bg-canvas text-ink-soft hover:bg-accent-tint")}>{t(l)}</button>
                  ))}
                </div>
              </Field>
            </div>
            <Field label="Expected pay (₹ per day)" htmlFor="rate" error={err("rate")}>
              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-mute">₹</span>
                <Input id="rate" type="number" inputMode="numeric" min={0} value={f.rate} onChange={(e) => set("rate", e.target.value)} className="pl-9 tabular-nums" placeholder="800" />
              </div>
            </Field>
            <Field label="When can you start?">
              <Segmented<Availability> label="Availability" value={f.availability} onChange={(v) => set("availability", v)}
                options={[{ id: "now", label: "Right now" }, { id: "week", label: "Within a week" }, { id: "later", label: "Not now" }]} />
            </Field>
            <div className="sm:col-span-2">
              <Field label="About your work (optional)" htmlFor="about" hint="A few lines help contractors choose you">
                <Textarea id="about" value={f.about} onChange={(e) => set("about", e.target.value)} maxLength={280} placeholder={t("What kind of work do you do best?")} />
              </Field>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="mt-6 grid gap-6 grid-cols-1 sm:grid-cols-2">
            <Field label="Emergency contact name" htmlFor="en" error={err("emergencyName")}>
              <Input id="en" value={f.emergencyName} onChange={(e) => set("emergencyName", e.target.value)} />
            </Field>
            <Field label="Emergency contact phone" htmlFor="ep" error={err("emergencyPhone")}>
              <Input id="ep" type="tel" inputMode="numeric" value={f.emergencyPhone} onChange={(e) => set("emergencyPhone", e.target.value)} className="tabular-nums" placeholder="98XXXXXXXX" />
            </Field>
            <div className="sm:col-span-2">
              <Field label="UPI ID (optional)" htmlFor="upi" error={err("upi")} hint="Contractors can pay you straight to this UPI ID. You can add it later.">
                <Input id="upi" value={f.upi} onChange={(e) => set("upi", e.target.value)} placeholder="name@upi" autoCapitalize="none" />
              </Field>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="mt-6">
            <dl className="divide-y divide-line rounded-2xl bg-canvas">
              {([
                ["Name", f.name], ["Phone", f.phone], ["Year of birth", f.birthYear], ["Area", `${t(f.area)}, ${t(CITY)}`],
                ["Main skill", `${t(f.skill)} · ${t("{n} years", { n: f.experience })}`],
                ["Languages", f.languages.map((l) => t(l)).join(", ")], ["Expected pay", `₹${Number(f.rate).toLocaleString("en-IN")} ${t("per day")}`],
                ["Emergency contact", `${f.emergencyName} · ${digits(f.emergencyPhone)}`], ["UPI ID", f.upi || "—"],
              ] as const).map(([k, v]) => (
                <div key={k} className="flex justify-between gap-6 px-5 py-3 text-[15px]"><dt className="text-ink-mute">{t(k)}</dt><dd className="text-right tabular-nums">{v}</dd></div>
              ))}
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
          <Button variant="primary" onClick={next} icon={step === STEPS.length - 1 ? <Check size={18} /> : <ArrowRight size={18} />} className="min-w-[200px] flex-row-reverse">
            {step === STEPS.length - 1 ? t("Create my profile") : t("Continue")}
          </Button>
        </div>
      </Card>
    </div>
  );
}

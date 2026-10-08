"use client";
import { BadgeCheck, Camera, Check, ChevronRight, Clock, MapPin, Pencil, Plus, Trash2, Upload } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import type { Site } from "@/data/types";
import { RatingSummary, Stars } from "@/components/reviews/Stars";
import { ReviewCard } from "@/components/reviews/ReviewCard";
import { AmenityChips } from "@/components/site/AmenityChips";
import { SiteModal } from "@/components/site/SiteModal";
import { ProgressRing } from "@/components/worker/ProgressRing";
import { TrustChip } from "@/components/worker/TrustParts";
import { Avatar } from "@/components/ui/Avatar";
import { ImagePlaceholder } from "@/components/ui/ImagePlaceholder";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Field, Input, Textarea } from "@/components/ui/Fields";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/components/ui/cn";
import { useToast } from "@/components/ui/Toast";
import { contractorChecklist, contractorScore, levelOf } from "@/lib/contractorTrust";
import { fileToDataUrl } from "@/lib/images";
import { tn, useT } from "@/lib/i18n";
import { useContractorRating } from "@/lib/ratings";
import { useStore } from "@/lib/store";

const KIND_LABEL = { individual: "Individual", firm: "Firm", company: "Company" } as const;

export default function ContractorProfilePage() {
  const t = useT();
  const toast = useToast();
  const { contractorProfile: p, updateContractorProfile, sites, removeSite, jobs } = useStore();
  const { list: reviews, stats } = useContractorRating();
  const [siteOpen, setSiteOpen] = useState<Site | "new" | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const refs = { sites: useRef<HTMLDivElement>(null), top: useRef<HTMLDivElement>(null) };

  const items = useMemo(() => contractorChecklist(p, sites, stats.count), [p, sites, stats.count]);
  const score = contractorScore(p, sites, stats.count);
  const level = levelOf(score);
  const next = [...items].filter((i) => !i.done).sort((a, b) => (b.points - b.earned) - (a.points - a.earned))[0];
  const scrollTo = (id: string) => {
    const el = id === "sites" || id === "photos" ? refs.sites.current : refs.top.current;
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
    if (["about", "upi", "pledge"].includes(id)) setEditOpen(true);
  };

  const setLogo = async (f: File) => {
    const url = await fileToDataUrl(f, 400);
    if (!url) return toast(t("Please choose an image file"));
    updateContractorProfile((x) => ({ ...x, logo: url })); toast(t("Photo updated"));
  };

  const badges = [
    { on: !!p.upi, label: "UPI payouts set", icon: BadgeCheck },
    { on: p.pledge, label: "Fair-pay pledge", icon: Check },
  ];

  return (
    <div ref={refs.top}>
      <Card className="p-6 md:p-10">
        <div className="flex flex-wrap items-center gap-x-8 gap-y-6">
          <div className="flex min-w-0 flex-1 basis-[320px] items-center gap-5">
            <div className="relative shrink-0">
              {p.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.logo} alt={p.company} className="h-24 w-24 rounded-3xl object-cover md:h-28 md:w-28" />
              ) : <Avatar name={p.company || p.ownerName} size={112} className="max-md:!h-24 max-md:!w-24 !rounded-3xl" />}
              <label className="absolute -bottom-1 -right-1 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-ink text-white shadow-pop focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ink">
                <Camera size={18} /><span className="sr-only">{t("Upload logo")}</span>
                <input type="file" accept="image/*" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) setLogo(f); e.target.value = ""; }} />
              </label>
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-[30px] font-normal leading-tight tracking-tight md:text-[40px]">{t(p.company)}</h1>
              <p className="mt-1 text-[15px] text-ink-mute">{t(KIND_LABEL[p.kind])} · {tn(t, p.yearsInBusiness, "{n} year in business", "{n} years in business")} · {t(p.city)}</p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <TrustChip level={level} />
                {stats.avg ? <span className="inline-flex items-center gap-2 text-sm"><Stars value={stats.avg} size={16} /><span className="tabular-nums">{stats.avg.toFixed(1)}</span><span className="text-ink-mute">({stats.count})</span></span> : <span className="text-sm text-ink-mute">{t("No reviews yet")}</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-5">
            <ProgressRing value={score} size={132} label={t("Profile strength")} />
            <div className="max-w-[220px]">
              <div className="text-lg text-ink">{t("Profile strength")}</div>
              <p className="mt-1 text-sm text-ink-mute">{score >= 90 ? t("Your profile is complete.") : t("A complete profile gets more and better applicants.")}</p>
              {next && <Button size="sm" variant="primary" className="mt-3" onClick={() => scrollTo(next.id)}>{t(next.label)} · +{next.points - next.earned}</Button>}
            </div>
          </div>
        </div>
        <div className="mt-6 border-t border-line pt-5">
          <div className="mb-3 text-sm text-ink-mute">{t("What workers see")}</div>
          <ul className="flex flex-wrap gap-2">
            {badges.map((b) => (
              <li key={b.label} className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px]", b.on ? "bg-ok-bg text-ok-fg" : "bg-canvas text-ink-mute line-through decoration-ink-mute/40")}><b.icon size={14} aria-hidden />{t(b.label)}</li>
            ))}
            <li className="inline-flex items-center gap-1.5 rounded-full bg-canvas px-3 py-1.5 text-[13px] text-ink-soft"><MapPin size={14} aria-hidden />{tn(t, sites.length, "{n} site", "{n} sites")}</li>
          </ul>
        </div>
      </Card>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-12">
        <Card className="lg:col-span-12">
          <CardHeader title="Complete your profile" subtitle={t("{n} of {m} done", { n: items.filter((i) => i.done).length, m: items.length })} />
          <ul className="space-y-1 px-3 pb-6 md:px-5">
            {items.map((i) => (
              <li key={i.id}>
                <button onClick={() => !i.done && scrollTo(i.id)} disabled={i.done} className="flex min-h-14 w-full items-center gap-3 rounded-2xl px-3 py-2 text-left transition-colors enabled:hover:bg-canvas">
                  <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full", i.done ? "bg-ok-bg text-ok-fg" : i.earned ? "bg-warn-bg text-warn-fg" : "bg-canvas text-ink-mute")}>
                    {i.done ? <Check size={18} /> : i.earned ? <Clock size={16} /> : <span className="text-xs tabular-nums">+{i.points}</span>}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={cn("block text-[15px]", i.done ? "text-ink-soft" : "text-ink")}>{t(i.label)}</span>
                    <span className="block truncate text-xs text-ink-mute">{t(i.hint)}</span>
                  </span>
                  {!i.done && <ChevronRight size={18} className="shrink-0 text-ink-mute" />}
                </button>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {/* Sites */}
      <div ref={refs.sites} className="mt-5 scroll-mt-6">
        <Card>
          <CardHeader title="My sites" subtitle="Workers see the amenities before they apply" action={<Button size="sm" variant="primary" icon={<Plus size={16} />} onClick={() => setSiteOpen("new")}>{t("Add site")}</Button>} />
          <div className="grid grid-cols-1 gap-4 px-4 pb-6 md:px-8 md:pb-8 sm:grid-cols-2 xl:grid-cols-3">
            {sites.map((s) => {
              const n = jobs.filter((j) => j.siteId === s.id).length;
              return (
                <article key={s.id} className="overflow-hidden rounded-2xl bg-canvas">
                  <div className="aspect-[16/9] w-full overflow-hidden bg-white">
                    {s.photos[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={s.photos[0]} alt={s.name} className="h-full w-full object-cover" />
                    ) : <ImagePlaceholder skill={s.kind === "commercial" ? "Electrician" : s.kind === "industrial" ? "Plumber" : "Mason"} label={s.name} />}
                  </div>
                  <div className="space-y-3 p-4">
                    <div>
                      <div className="flex items-start justify-between gap-2"><h3 className="text-[17px] text-ink">{s.name}</h3><Chip tone="slate">{t(s.kind[0].toUpperCase() + s.kind.slice(1))}</Chip></div>
                      <p className="mt-0.5 flex items-start gap-1 text-xs text-ink-mute"><MapPin size={12} className="mt-0.5 shrink-0" />{t(s.address)}</p>
                    </div>
                    <AmenityChips amenities={s.amenities} compact max={7} />
                    <div className="flex items-center justify-between gap-2 text-xs text-ink-mute">
                      <span>{tn(t, n, "{n} job here", "{n} jobs here")}</span>
                      <span className="flex gap-1">
                        <Button size="sm" variant="dark" icon={<Pencil size={14} />} onClick={() => setSiteOpen(s)}>{t("Edit")}</Button>
                        {n === 0 && <button onClick={() => { removeSite(s.id); toast(t("Site removed")); }} aria-label={t("Remove {name}", { name: s.name })} className="flex h-11 w-11 items-center justify-center rounded-full text-ink-mute hover:bg-white hover:text-bad-fg md:h-9 md:w-9"><Trash2 size={15} /></button>}
                      </span>
                    </div>
                  </div>
                </article>
              );
            })}
            {sites.length === 0 && <p className="py-8 text-center text-sm text-ink-mute sm:col-span-2 xl:col-span-3">{t("Add your first site to start posting jobs.")}</p>}
          </div>
        </Card>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-12">
        <Card className="lg:col-span-5">
          <CardHeader title="Business details" action={<Button size="sm" variant="dark" icon={<Pencil size={16} />} onClick={() => setEditOpen(true)}>{t("Edit")}</Button>} />
          <dl className="divide-y divide-line px-6 pb-4 text-[15px]">
            {([
              ["Your name", t(p.ownerName)], ["Phone", p.phone], ["Trades", p.trades.map((x) => t(x)).join(", ") || "—"], ["Areas", p.areas.map((x) => t(x)).join(", ") || "—"],
              ["Office or home address", p.officeAddress || "—"], ["GSTIN", p.gst || "—"], ["UPI ID", p.upi || "—"],
            ] as const).map(([k, v]) => <div key={k} className="flex justify-between gap-4 py-3"><dt className="shrink-0 text-ink-mute">{t(k)}</dt><dd className="text-right tabular-nums">{v}</dd></div>)}
          </dl>
          {p.about && <p className="mx-6 mb-6 rounded-2xl bg-canvas p-4 text-sm text-ink-soft">{p.about}</p>}
        </Card>
        <Card className="lg:col-span-7">
          <CardHeader title="Reviews from workers" subtitle="Every review is tied to a real job" />
          <div className="px-4 pb-6 md:px-8 md:pb-8">
            <RatingSummary stats={stats} className="mb-5" />
            <div className="space-y-3">{reviews.slice(0, 4).map((r) => <ReviewCard key={r.id} review={r} />)}</div>
          </div>
        </Card>
      </div>

      <SiteModal open={siteOpen !== null} site={siteOpen === "new" ? null : siteOpen} onClose={() => setSiteOpen(null)} />
      <EditModal open={editOpen} onClose={() => setEditOpen(false)} />
    </div>
  );
}

function EditModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT();
  const toast = useToast();
  const { contractorProfile: p, updateContractorProfile } = useStore();
  const [f, setF] = useState({ about: p.about, officeAddress: p.officeAddress, gst: p.gst, upi: p.upi, pledge: p.pledge });
  const [was, setWas] = useState(false);
  if (open && !was) { setWas(true); setF({ about: p.about, officeAddress: p.officeAddress, gst: p.gst, upi: p.upi, pledge: p.pledge }); }
  if (!open && was) setWas(false);
  const upiBad = !!f.upi.trim() && !/^[\w.\-]{2,}@[A-Za-z]{2,}$/.test(f.upi.trim());
  const gstBad = !!f.gst.trim() && !/^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$/.test(f.gst.trim().toUpperCase());
  const save = () => {
    if (upiBad || gstBad) return;
    updateContractorProfile((x) => ({ ...x, ...f, gst: f.gst.trim().toUpperCase(), upi: f.upi.trim() }));
    toast(t("Details saved")); onClose();
  };
  return (
    <Modal open={open} onClose={onClose} title="Edit business details"
      footer={<><Button onClick={onClose}>{t("Cancel")}</Button><Button variant="primary" onClick={save}>{t("Save")}</Button></>}>
      <div className="space-y-5">
        <Field label="About your business" htmlFor="eab"><Textarea id="eab" value={f.about} onChange={(e) => setF({ ...f, about: e.target.value })} maxLength={280} /></Field>
        <Field label="Office or home address" htmlFor="eaddr"><Input id="eaddr" value={f.officeAddress} onChange={(e) => setF({ ...f, officeAddress: e.target.value })} /></Field>
        <Field label="GSTIN (optional)" htmlFor="egst" error={gstBad ? "Enter a valid 15-character GSTIN, or leave it empty" : undefined}><Input id="egst" value={f.gst} maxLength={15} onChange={(e) => setF({ ...f, gst: e.target.value })} className="tabular-nums" /></Field>
        <Field label="UPI ID" htmlFor="eupi" error={upiBad ? "Enter a valid UPI ID, like name@upi" : undefined}><Input id="eupi" value={f.upi} onChange={(e) => setF({ ...f, upi: e.target.value })} autoCapitalize="none" placeholder="name@upi" /></Field>
        <label className="flex cursor-pointer items-start gap-3 text-[15px] text-ink-soft">
          <input type="checkbox" checked={f.pledge} onChange={(e) => setF({ ...f, pledge: e.target.checked })} className="mt-1 h-5 w-5 shrink-0 accent-[#15110E]" /><span>{t("I accept the fair-pay pledge.")}</span>
        </label>
      </div>
    </Modal>
  );
}

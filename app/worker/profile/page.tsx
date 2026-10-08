"use client";
import { Camera, Check, ChevronRight, Clock, Pencil, Plus, ShieldCheck, Trash2, Upload, UserPlus } from "lucide-react";
import { useMemo, useRef, useState, type ChangeEvent } from "react";
import { AREAS, CITY, SKILLS, contractorOf, currentWorkerId } from "@/data/jobs";
import type { Availability } from "@/data/types";
import { ProgressRing } from "@/components/worker/ProgressRing";
import { TrustChip, VerifyBadges, WorkTile } from "@/components/worker/TrustParts";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Field, Input, Select, Textarea } from "@/components/ui/Fields";
import { Modal } from "@/components/ui/Modal";
import { Segmented } from "@/components/ui/Segmented";
import { SkillIcon } from "@/components/ui/SkillIcon";
import { cn } from "@/components/ui/cn";
import { useToast } from "@/components/ui/Toast";
import { formatShort, rateLabel, TODAY } from "@/lib/format";
import { fileToDataUrl } from "@/lib/images";
import { tn, useT } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import { checklist, kamgarJobs, levelOf, scoreOf, trustFor } from "@/lib/trust";
import { RateContractorsCard, ReviewsAboutMe } from "@/components/worker/WorkerReviews";

const REL = ["Contractor", "Site supervisor", "Site engineer", "Another worker", "Other"];
const YEARS = [2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018];

/** A file picker styled like a button. */
function FilePick({ label, onFiles, multiple, icon }: { label: string; onFiles: (f: File[]) => void; multiple?: boolean; icon?: React.ReactNode }) {
  const t = useT();
  return (
    <label className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-full bg-canvas px-5 text-sm text-ink transition-colors focus-within:outline focus-within:outline-2 focus-within:outline-ink hover:bg-accent-tint">
      {icon}{t(label)}
      <input
        type="file" accept="image/*" multiple={multiple} className="sr-only"
        onChange={(e: ChangeEvent<HTMLInputElement>) => { const fs = Array.from(e.target.files ?? []); if (fs.length) onFiles(fs); e.target.value = ""; }}
      />
    </label>
  );
}

export default function WorkerProfilePage() {
  const t = useT();
  const toast = useToast();
  const { profile, updateProfile, applications, jobs } = useStore();
  const [workOpen, setWorkOpen] = useState(false);
  const [refOpen, setRefOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [viewWork, setViewWork] = useState<string | null>(null);
  const refs = { docs: useRef<HTMLDivElement>(null), works: useRef<HTMLDivElement>(null), refs: useRef<HTMLDivElement>(null), top: useRef<HTMLDivElement>(null) };

  const items = useMemo(() => checklist(profile), [profile]);
  const score = scoreOf(profile);
  const level = levelOf(score);
  const trust = trustFor(currentWorkerId, profile, currentWorkerId);
  const next = [...items].filter((i) => !i.done).sort((a, b) => (b.points - b.earned) - (a.points - a.earned))[0];
  const verified = kamgarJobs(currentWorkerId, applications, jobs);

  const scrollTo = (id: string) => {
    const el = id === "works" ? refs.works.current : id === "references" ? refs.refs.current : refs.top.current;
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
    if (id === "upi" || id === "about") setEditOpen(true);
  };

  const setPhoto = async (files: File[]) => {
    const url = await fileToDataUrl(files[0], 480);
    if (!url) return toast(t("Please choose an image file"));
    updateProfile((p) => ({ ...p, photo: url }));
    toast(t("Photo updated"));
  };

  const viewing = profile.works.find((w) => w.id === viewWork) ?? null;

  return (
    <div ref={refs.top}>
      {/* Header */}
      <Card className="p-6 md:p-10">
        <div className="flex flex-wrap items-center gap-x-8 gap-y-6">
          <div className="flex min-w-0 flex-1 basis-[320px] items-center gap-5">
            <div className="relative shrink-0">
              {profile.photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.photo} alt={t(profile.name)} className="h-24 w-24 rounded-full object-cover md:h-28 md:w-28" />
              ) : <Avatar name={profile.name} size={112} className="max-md:!h-24 max-md:!w-24" />}
              <label className="absolute -bottom-1 -right-1 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-ink text-white shadow-pop focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ink">
                <Camera size={18} /><span className="sr-only">{t("Upload photo")}</span>
                <input type="file" accept="image/*" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) setPhoto([f]); e.target.value = ""; }} />
              </label>
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-[30px] font-normal leading-tight tracking-tight md:text-[40px]">{t(profile.name)}</h1>
              <p className="mt-1 text-[15px] text-ink-mute">{t(profile.skill || "Worker")} · {t(profile.area || CITY)} · {t("{n} years", { n: profile.experience })}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <TrustChip level={level} />
                <Chip tone={profile.availability === "now" ? "green" : profile.availability === "week" ? "amber" : "slate"}>
                  {t(profile.availability === "now" ? "Available now" : profile.availability === "week" ? "Available within a week" : "Not available now")}
                </Chip>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-5">
            <ProgressRing value={score} size={132} label={t("Profile strength")} />
            <div className="max-w-[220px]">
              <div className="text-lg text-ink">{t("Profile strength")}</div>
              <p className="mt-1 text-sm text-ink-mute">{score >= 90 ? t("Your profile is complete.") : t("A stronger profile gets you chosen more often.")}</p>
              {next && <Button size="sm" variant="primary" className="mt-3" onClick={() => scrollTo(next.id)}>{t(next.label)} · +{next.points - next.earned}</Button>}
            </div>
          </div>
        </div>
        <div className="mt-6 border-t border-line pt-5">
          <div className="mb-3 text-sm text-ink-mute">{t("What contractors see")}</div>
          <VerifyBadges trust={trust} />
        </div>
      </Card>

      <div className="mt-5 grid gap-5 grid-cols-1 lg:grid-cols-12">
        {/* Checklist */}
        <Card className="lg:col-span-5">
          <CardHeader title="Complete your profile" subtitle={t("{n} of {m} done", { n: items.filter((i) => i.done).length, m: items.length })} />
          <ul className="space-y-1 px-3 pb-6 md:px-5">
            {items.map((i) => (
              <li key={i.id}>
                <button onClick={() => !i.done && scrollTo(i.id)} disabled={i.done}
                  className="flex min-h-14 w-full items-center gap-3 rounded-2xl px-3 py-2 text-left transition-colors enabled:hover:bg-canvas">
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

        <div className="space-y-5 lg:col-span-7">
          {/* Past work */}
          <div ref={refs.works} className="scroll-mt-6">
            <Card>
              <CardHeader title="Work I have done" subtitle={tn(t, profile.works.length, "{n} project", "{n} projects")}
                action={<Button size="sm" variant="primary" icon={<Plus size={16} />} onClick={() => setWorkOpen(true)}>{t("Add work")}</Button>} />
              <div className="px-4 pb-6 md:px-8 md:pb-8">
                {profile.works.length === 0 ? (
                  <div className="rounded-2xl bg-canvas p-8 text-center">
                    <p className="text-[15px] text-ink-soft">{t("Add photos of work you have finished. Contractors trust workers who can show their work.")}</p>
                    <Button className="mt-4" variant="primary" icon={<Plus size={16} />} onClick={() => setWorkOpen(true)}>{t("Add your first project")}</Button>
                  </div>
                ) : (
                  <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
                    {profile.works.map((w) => (
                      <WorkTile key={w.id} work={w} onClick={() => setViewWork(w.id)}
                        actions={<button onClick={() => updateProfile((p) => ({ ...p, works: p.works.filter((x) => x.id !== w.id) }))} aria-label={t("Remove {name}", { name: t(w.title) })} className="-mr-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink-mute hover:bg-white hover:text-bad-fg"><Trash2 size={16} /></button>} />
                    ))}
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-5 grid-cols-1 lg:grid-cols-12">
        {/* Verified on Kamgar */}
        <Card className="lg:col-span-7">
          <CardHeader title="Verified on Kamgar" subtitle="Confirmed by the contractor. You cannot edit these." />
          <ul className="space-y-3 px-4 pb-6 md:px-8 md:pb-8">
            {verified.map((j) => (
              <li key={j.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl bg-canvas p-4">
                <SkillIcon skill={j.skill} size={48} />
                <div className="min-w-0 flex-1 basis-44">
                  <div className="truncate text-[16px] text-ink">{t(j.title)}</div>
                  <div className="truncate text-xs text-ink-mute tabular-nums">{t(j.area)} · {formatShort(j.startDate)} – {formatShort(j.endDate)} · {rateLabel(j)}</div>
                  <div className="mt-0.5 text-xs text-ok-fg"><ShieldCheck size={12} className="mr-1 inline" />{t("Confirmed by {name}", { name: t(contractorOf(j.contractorId).company) })}</div>
                </div>
                <Chip tone={j.closed || j.endDate < TODAY ? "slate" : "blue"}>{t(j.closed || j.endDate < TODAY ? "Completed" : "Ongoing")}</Chip>
              </li>
            ))}
            {verified.length === 0 && <li className="py-6 text-center text-sm text-ink-mute">{t("Jobs you finish on Kamgar will appear here automatically.")}</li>}
          </ul>
        </Card>

        <div className="space-y-5 lg:col-span-5">
          {/* References */}
          <div ref={refs.refs} className="scroll-mt-6">
            <Card>
              <CardHeader title="References" subtitle="People who can vouch for your work"
                action={<Button size="sm" variant="dark" icon={<UserPlus size={16} />} onClick={() => setRefOpen(true)}>{t("Add")}</Button>} />
              <ul className="space-y-2 px-4 pb-6 md:px-6">
                {profile.references.map((r) => (
                  <li key={r.id} className="flex items-center gap-3 rounded-2xl bg-canvas p-3">
                    <Avatar name={r.name} size={44} />
                    <div className="min-w-0 flex-1"><div className="truncate text-[15px]">{r.name}</div><div className="truncate text-xs text-ink-mute">{t(r.relation)} · {r.phone}</div></div>
                    <button onClick={() => updateProfile((p) => ({ ...p, references: p.references.filter((x) => x.id !== r.id) }))} aria-label={t("Remove {name}", { name: r.name })} className="flex h-11 w-11 items-center justify-center rounded-full text-ink-mute hover:bg-white hover:text-bad-fg"><Trash2 size={16} /></button>
                  </li>
                ))}
                {profile.references.length === 0 && <li className="py-4 text-center text-sm text-ink-mute">{t("Add a contractor or supervisor who knows your work.")}</li>}
              </ul>
            </Card>
          </div>

          {/* Details */}
          <Card>
            <CardHeader title="My details" action={<Button size="sm" variant="dark" icon={<Pencil size={16} />} onClick={() => setEditOpen(true)}>{t("Edit")}</Button>} />
            <dl className="divide-y divide-line px-6 pb-4 text-[15px]">
              {([
                ["Phone", profile.phone], ["Expected pay", `₹${profile.rate.toLocaleString("en-IN")} ${t("per day")}`],
                ["Languages", profile.languages.map((l) => t(l)).join(", ") || "—"], ["UPI ID", profile.upi || "—"],
                ["Emergency contact", profile.emergencyName ? `${profile.emergencyName} · ${profile.emergencyPhone}` : "—"],
              ] as const).map(([k, v]) => <div key={k} className="flex justify-between gap-4 py-3"><dt className="text-ink-mute">{t(k)}</dt><dd className="text-right tabular-nums">{v}</dd></div>)}
            </dl>
            {profile.about && <p className="mx-6 mb-6 rounded-2xl bg-canvas p-4 text-sm text-ink-soft">{profile.about}</p>}
          </Card>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="lg:col-span-6"><RateContractorsCard /></div>
        <div className="lg:col-span-6"><ReviewsAboutMe /></div>
      </div>

      <WorkModal open={workOpen} onClose={() => setWorkOpen(false)} />
      <RefModal open={refOpen} onClose={() => setRefOpen(false)} />
      <EditModal open={editOpen} onClose={() => setEditOpen(false)} />
      <Modal open={!!viewing} onClose={() => setViewWork(null)} title={viewing ? viewing.title : ""}>
        {viewing && (
          <div>
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
              {viewing.images.map((src, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={src} alt={`${viewing.title} ${i + 1}`} className="w-full rounded-2xl object-cover" />
              ))}
            </div>
            <p className="mt-4 text-sm text-ink-mute">{t(viewing.skill)} · {t(viewing.area)} · {viewing.year}</p>
            {viewing.description && <p className="mt-2 text-[15px] text-ink-soft">{viewing.description}</p>}
            {viewing.refName && <p className="mt-3 text-sm text-ink-soft">{t("Reference")}: {viewing.refName}{viewing.refPhone ? ` · ${viewing.refPhone}` : ""}</p>}
          </div>
        )}
      </Modal>
    </div>
  );
}

/* ---------------- Add past work ---------------- */
function WorkModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT();
  const toast = useToast();
  const { profile, updateProfile } = useStore();
  const blank = { title: "", skill: profile.skill, area: profile.area, year: String(new Date().getFullYear()), description: "", refName: "", refPhone: "" };
  const [f, setF] = useState(blank);
  const [images, setImages] = useState<string[]>([]);
  const [tried, setTried] = useState(false);
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));
  const close = () => { setF(blank); setImages([]); setTried(false); onClose(); };

  const addFiles = async (fs: File[]) => {
    const urls = (await Promise.all(fs.slice(0, 4 - images.length).map((x) => fileToDataUrl(x)))).filter((u): u is string => !!u);
    setImages((p) => [...p, ...urls].slice(0, 4));
  };
  const errs = { title: !f.title.trim() && "Give this project a name", skill: !f.skill && "Choose the skill used", area: !f.area && "Choose the area", images: images.length === 0 && "Add at least one photo" };
  const save = () => {
    setTried(true);
    if (Object.values(errs).some(Boolean)) return;
    updateProfile((p) => ({ ...p, works: [{ id: crypto.randomUUID(), title: f.title.trim(), skill: f.skill, area: f.area, year: Number(f.year), description: f.description.trim(), images, refName: f.refName.trim() || undefined, refPhone: f.refPhone.trim() || undefined }, ...p.works] }));
    toast(t("Project added to your profile"));
    close();
  };
  const e = (k: keyof typeof errs) => (tried && errs[k] ? (errs[k] as string) : undefined);

  return (
    <Modal open={open} onClose={close} title="Add past work"
      footer={<><Button onClick={close}>{t("Cancel")}</Button><Button variant="primary" onClick={save}>{t("Add project")}</Button></>}>
      <div className="grid gap-5 grid-cols-1 sm:grid-cols-2">
        <div className="sm:col-span-2"><Field label="Project name" htmlFor="wt" error={e("title")}><Input id="wt" value={f.title} onChange={(x) => set("title", x.target.value)} placeholder={t("e.g. Boundary wall, 120 ft")} /></Field></div>
        <Field label="Skill used" htmlFor="ws" error={e("skill")}>
          <Select id="ws" value={f.skill} onChange={(x) => set("skill", x.target.value)}><option value="">{t("Select skill")}</option>{SKILLS.map((s) => <option key={s} value={s}>{t(s)}</option>)}</Select>
        </Field>
        <Field label="Area" htmlFor="wa" error={e("area")}>
          <Select id="wa" value={f.area} onChange={(x) => set("area", x.target.value)}><option value="">{t("Select area")}</option>{AREAS.map((s) => <option key={s} value={s}>{t(s)}</option>)}</Select>
        </Field>
        <Field label="Year" htmlFor="wy"><Select id="wy" value={f.year} onChange={(x) => set("year", x.target.value)}>{YEARS.map((y) => <option key={y}>{y}</option>)}</Select></Field>
        <div className="sm:col-span-2"><Field label="What did you do? (optional)" htmlFor="wd"><Textarea id="wd" value={f.description} onChange={(x) => set("description", x.target.value)} maxLength={240} /></Field></div>
        <div className="sm:col-span-2">
          <div className="mb-2 text-sm font-medium text-ink-soft">{t("Photos (up to 4)")}</div>
          <div className="flex flex-wrap items-center gap-2">
            <FilePick label="Add photos" multiple onFiles={addFiles} icon={<Camera size={16} />} />
          </div>
          {images.length > 0 && (
            <ul className="mt-3 grid grid-cols-4 gap-2">
              {images.map((src, i) => (
                <li key={i} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt={`${t("Photo")} ${i + 1}`} className="aspect-square w-full rounded-xl object-cover" />
                  <button onClick={() => setImages((p) => p.filter((_, j) => j !== i))} aria-label={t("Remove photo")} className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full bg-ink text-white"><Trash2 size={13} /></button>
                </li>
              ))}
            </ul>
          )}
          {e("images") && <p className="mt-2 text-xs font-medium text-bad-fg">{t(e("images")!)}</p>}
        </div>
        <Field label="Who can confirm this? (optional)" htmlFor="wr"><Input id="wr" value={f.refName} onChange={(x) => set("refName", x.target.value)} placeholder={t("Contractor or supervisor name")} /></Field>
        <Field label="Their phone (optional)" htmlFor="wp"><Input id="wp" type="tel" inputMode="numeric" value={f.refPhone} onChange={(x) => set("refPhone", x.target.value)} className="tabular-nums" /></Field>
      </div>
    </Modal>
  );
}

/* ---------------- Reference ---------------- */
function RefModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT();
  const toast = useToast();
  const { updateProfile } = useStore();
  const [f, setF] = useState({ name: "", relation: REL[0], phone: "" });
  const [tried, setTried] = useState(false);
  const close = () => { setF({ name: "", relation: REL[0], phone: "" }); setTried(false); onClose(); };
  const bad = { name: !f.name.trim() && "Enter their name", phone: f.phone.replace(/\D/g, "").length !== 10 && "Enter a 10-digit phone number" };
  const save = () => {
    setTried(true);
    if (bad.name || bad.phone) return;
    updateProfile((p) => ({ ...p, references: [...p.references, { id: crypto.randomUUID(), name: f.name.trim(), relation: f.relation, phone: f.phone.replace(/\D/g, "") }] }));
    toast(t("Reference added"));
    close();
  };
  return (
    <Modal open={open} onClose={close} title="Add a reference"
      footer={<><Button onClick={close}>{t("Cancel")}</Button><Button variant="primary" onClick={save}>{t("Add reference")}</Button></>}>
      <div className="space-y-5">
        <Field label="Name" htmlFor="rn" error={tried && bad.name ? (bad.name as string) : undefined}><Input id="rn" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        <Field label="Who are they?" htmlFor="rr"><Select id="rr" value={f.relation} onChange={(e) => setF({ ...f, relation: e.target.value })}>{REL.map((r) => <option key={r} value={r}>{t(r)}</option>)}</Select></Field>
        <Field label="Phone" htmlFor="rp" error={tried && bad.phone ? (bad.phone as string) : undefined}><Input id="rp" type="tel" inputMode="numeric" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} className="tabular-nums" /></Field>
      </div>
    </Modal>
  );
}

/* ---------------- Edit details ---------------- */
function EditModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT();
  const toast = useToast();
  const { profile, updateProfile } = useStore();
  const [f, setF] = useState({ rate: String(profile.rate), availability: profile.availability, about: profile.about, upi: profile.upi });
  const [wasOpen, setWasOpen] = useState(false);
  if (open && !wasOpen) { setWasOpen(true); setF({ rate: String(profile.rate), availability: profile.availability, about: profile.about, upi: profile.upi }); }
  if (!open && wasOpen) setWasOpen(false);
  const upiBad = !!f.upi.trim() && !/^[\w.\-]{2,}@[A-Za-z]{2,}$/.test(f.upi.trim());
  const save = () => {
    if (upiBad || !(Number(f.rate) > 0)) return;
    updateProfile((p) => ({ ...p, rate: Number(f.rate), availability: f.availability, about: f.about, upi: f.upi.trim() }));
    toast(t("Details saved"));
    onClose();
  };
  return (
    <Modal open={open} onClose={onClose} title="Edit details"
      footer={<><Button onClick={onClose}>{t("Cancel")}</Button><Button variant="primary" onClick={save}>{t("Save")}</Button></>}>
      <div className="space-y-5">
        <Field label="Expected pay (₹ per day)" htmlFor="er"><Input id="er" type="number" inputMode="numeric" value={f.rate} onChange={(e) => setF({ ...f, rate: e.target.value })} className="tabular-nums" /></Field>
        <Field label="When can you start?"><Segmented<Availability> label="Availability" value={f.availability} onChange={(v) => setF({ ...f, availability: v })} options={[{ id: "now", label: "Right now" }, { id: "week", label: "Within a week" }, { id: "later", label: "Not now" }]} /></Field>
        <Field label="UPI ID" htmlFor="eu" error={upiBad ? "Enter a valid UPI ID, like name@upi" : undefined}><Input id="eu" value={f.upi} onChange={(e) => setF({ ...f, upi: e.target.value })} autoCapitalize="none" placeholder="name@upi" /></Field>
        <Field label="About your work" htmlFor="ea"><Textarea id="ea" value={f.about} onChange={(e) => setF({ ...f, about: e.target.value })} maxLength={280} /></Field>
      </div>
    </Modal>
  );
}

"use client";
import { Camera, Trash2 } from "lucide-react";
import { useState } from "react";
import { AREAS } from "@/data/jobs";
import type { Amenity, Site, SiteKind } from "@/data/types";
import { fileToDataUrl } from "@/lib/images";
import { useT } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import { Button } from "../ui/Button";
import { Field, Input, Select } from "../ui/Fields";
import { Modal } from "../ui/Modal";
import { cn } from "../ui/cn";
import { useToast } from "../ui/Toast";
import { AMENITIES } from "./AmenityChips";

const KINDS: { id: SiteKind; label: string }[] = [{ id: "residential", label: "Residential" }, { id: "commercial", label: "Commercial" }, { id: "industrial", label: "Industrial" }, { id: "other", label: "Other" }];

/** Add or edit a work site: where it is, who to call, what workers get, and photos. */
export function SiteModal({ open, site, onClose, onSaved }: { open: boolean; site?: Site | null; onClose: () => void; onSaved?: (s: Site) => void }) {
  const t = useT();
  const toast = useToast();
  const { addSite, updateSite, contractorProfile } = useStore();
  const blank = { name: "", area: "", address: "", kind: "residential" as SiteKind, contactName: contractorProfile.ownerName, contactPhone: contractorProfile.phone, amenities: ["water", "toilet"] as Amenity[], photos: [] as string[] };
  const [f, setF] = useState(blank);
  const [tried, setTried] = useState(false);
  const [key, setKey] = useState("");
  // Load the site being edited whenever the dialog opens for a different one.
  const openKey = open ? (site?.id ?? "new") : "";
  if (openKey !== key) {
    setKey(openKey);
    if (openKey) setF(site ? { name: site.name, area: site.area, address: site.address, kind: site.kind, contactName: site.contactName, contactPhone: site.contactPhone, amenities: site.amenities, photos: site.photos } : blank);
  }
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }));
  const toggle = (a: Amenity) => set("amenities", f.amenities.includes(a) ? f.amenities.filter((x) => x !== a) : [...f.amenities, a]);
  const close = () => { setTried(false); onClose(); };

  const errs = {
    name: !f.name.trim() && "Give the site a name",
    area: !f.area && "Choose an area",
    address: f.address.trim().length < 8 && "Enter the full address",
    contactPhone: f.contactPhone.replace(/\D/g, "").length !== 10 && "Enter a 10-digit phone number",
  };
  const e = (k: keyof typeof errs) => (tried && errs[k] ? (errs[k] as string) : undefined);
  const addFiles = async (fs: File[]) => {
    const urls = (await Promise.all(fs.slice(0, 3 - f.photos.length).map((x) => fileToDataUrl(x, 640, 0.65)))).filter((u): u is string => !!u);
    set("photos", [...f.photos, ...urls].slice(0, 3));
  };
  const save = async () => {
    setTried(true);
    if (Object.values(errs).some(Boolean)) return;
    const data = { ...f, name: f.name.trim(), address: f.address.trim(), contactName: f.contactName.trim() || contractorProfile.ownerName };
    try {
      const saved = site ? (await updateSite(site.id, data), { ...site, ...data }) : await addSite(data);
      toast(t(site ? "Site updated" : "Site added"));
      onSaved?.(saved);
      close();
    } catch (err) { toast(err instanceof Error ? err.message : t("Could not save the site. Please try again.")); }
  };

  return (
    <Modal open={open} onClose={close} title={site ? "Edit site" : "Add a site"}
      footer={<><Button onClick={close}>{t("Cancel")}</Button><Button variant="primary" onClick={save}>{t(site ? "Save site" : "Add site")}</Button></>}>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2"><Field label="Site name" htmlFor="sn" error={e("name")}><Input id="sn" value={f.name} onChange={(x) => set("name", x.target.value)} placeholder={t("e.g. Datta Residency")} /></Field></div>
        <Field label="Area" htmlFor="sa" error={e("area")}>
          <Select id="sa" value={f.area} onChange={(x) => set("area", x.target.value)}><option value="">{t("Select area")}</option>{AREAS.map((a) => <option key={a} value={a}>{t(a)}</option>)}</Select>
        </Field>
        <Field label="Type of site" htmlFor="sk">
          <Select id="sk" value={f.kind} onChange={(x) => set("kind", x.target.value as SiteKind)}>{KINDS.map((k) => <option key={k.id} value={k.id}>{t(k.label)}</option>)}</Select>
        </Field>
        <div className="sm:col-span-2"><Field label="Full address" htmlFor="sd" error={e("address")} hint="Workers see this once you accept them"><Input id="sd" value={f.address} onChange={(x) => set("address", x.target.value)} placeholder={t("Plot / building, street, landmark")} /></Field></div>
        <Field label="Site contact name" htmlFor="sc"><Input id="sc" value={f.contactName} onChange={(x) => set("contactName", x.target.value)} /></Field>
        <Field label="Site contact phone" htmlFor="sp" error={e("contactPhone")}><Input id="sp" type="tel" inputMode="numeric" value={f.contactPhone} onChange={(x) => set("contactPhone", x.target.value)} className="tabular-nums" /></Field>

        <div className="sm:col-span-2">
          <div className="mb-2 text-sm font-medium text-ink-soft">{t("What workers get on this site")}</div>
          <div className="flex flex-wrap gap-2">
            {AMENITIES.map((a) => (
              <button key={a.id} type="button" aria-pressed={f.amenities.includes(a.id)} onClick={() => toggle(a.id)}
                className={cn("inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm transition-colors", f.amenities.includes(a.id) ? "bg-ink text-white" : "bg-canvas text-ink-soft hover:bg-accent-tint")}>
                <a.icon size={15} />{t(a.label)}
              </button>
            ))}
          </div>
        </div>

        <div className="sm:col-span-2">
          <div className="mb-2 text-sm font-medium text-ink-soft">{t("Site photos (up to 3)")}</div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-full bg-canvas px-5 text-sm text-ink hover:bg-accent-tint focus-within:outline focus-within:outline-2 focus-within:outline-ink">
              <Camera size={16} />{t("Add photos")}
              <input type="file" accept="image/*" multiple className="sr-only" onChange={(x) => { const fs = Array.from(x.target.files ?? []); if (fs.length) addFiles(fs); x.target.value = ""; }} />
            </label>
          </div>
          {f.photos.length > 0 && (
            <ul className="mt-3 grid grid-cols-3 gap-2">
              {f.photos.map((src, i) => (
                <li key={i} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt={`${t("Photo")} ${i + 1}`} className="aspect-[4/3] w-full rounded-xl object-cover" />
                  <button onClick={() => set("photos", f.photos.filter((_, j) => j !== i))} aria-label={t("Remove photo")} className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full bg-ink text-white"><Trash2 size={13} /></button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  );
}

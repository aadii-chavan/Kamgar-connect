"use client";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useT } from "@/lib/i18n";
import { useDialog } from "./useDialog";

export interface Slide { key: string; node: ReactNode; title: string; meta?: string; body?: string }

/** Full-screen photo viewer with previous / next, arrow keys and Esc. */
export function Lightbox({ slides, start = 0, onClose }: { slides: Slide[]; start?: number; onClose: () => void }) {
  const t = useT();
  const [i, setI] = useState(start);
  const ref = useDialog(slides.length > 0, onClose);
  const go = (d: number) => setI((x) => (x + d + slides.length) % slides.length);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "ArrowRight") go(1); if (e.key === "ArrowLeft") go(-1); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });
  const s = slides[i];
  if (!s) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-8">
      <div className="absolute inset-0 bg-black/85" onClick={onClose} aria-hidden />
      <div ref={ref} role="dialog" aria-modal="true" aria-label={s.title} className="relative flex max-h-full w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-pop">
        <div className="relative aspect-[4/3] w-full bg-black sm:aspect-[16/10]">
          <div className="h-full w-full [&>*]:h-full [&>*]:w-full [&>*]:object-contain">{s.node}</div>
          {slides.length > 1 && (
            <>
              <button onClick={() => go(-1)} aria-label={t("Previous photo")} className="absolute left-3 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-ink hover:bg-white"><ChevronLeft size={22} /></button>
              <button onClick={() => go(1)} aria-label={t("Next photo")} className="absolute right-3 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-ink hover:bg-white"><ChevronRight size={22} /></button>
            </>
          )}
          <button onClick={onClose} aria-label={t("Close")} className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-ink hover:bg-white"><X size={20} /></button>
          <span className="absolute bottom-3 left-3 rounded-full bg-black/60 px-3 py-1 text-sm text-white tabular-nums">{i + 1} / {slides.length}</span>
        </div>
        <div className="px-6 py-5">
          <div className="text-xl text-ink">{s.title}</div>
          {s.meta && <div className="mt-0.5 text-sm text-ink-mute">{s.meta}</div>}
          {s.body && <p className="mt-2 text-[15px] text-ink-soft">{s.body}</p>}
        </div>
      </div>
    </div>
  );
}

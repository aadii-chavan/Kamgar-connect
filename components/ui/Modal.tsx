"use client";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { useT } from "@/lib/i18n";
import { useDialog } from "./useDialog";

export function Modal({ open, onClose, title, children, footer }: {
  open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode;
}) {
  const t = useT();
  const ref = useDialog(open, onClose);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div
        ref={ref} role="dialog" aria-modal="true" aria-label={t(title)}
        className="relative flex max-h-[90vh] w-full max-w-md flex-col rounded-t-3xl bg-white shadow-pop sm:rounded-3xl"
      >
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <h2 className="text-xl font-normal">{t(title)}</h2>
          <button onClick={onClose} aria-label={t("Close")} className="-mr-2 flex h-11 w-11 items-center justify-center rounded-full text-ink-mute hover:bg-black/5">
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-6">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-line px-6 py-4">{footer}</div>}
      </div>
    </div>
  );
}

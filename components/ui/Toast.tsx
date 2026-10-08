"use client";
import { CheckCircle2, X } from "lucide-react";
import { useT } from "@/lib/i18n";
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";

interface ToastItem { id: number; message: string; action?: { label: string; onClick: () => void } }
interface ToastApi { toast: (message: string, action?: ToastItem["action"]) => void }

const Ctx = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);
  const t_ = useT();

  const dismiss = useCallback((id: number) => setItems((p) => p.filter((t) => t.id !== id)), []);
  const toast = useCallback<ToastApi["toast"]>((message, action) => {
    const id = nextId.current++;
    setItems((p) => [...p, { id, message, action }]);
    setTimeout(() => dismiss(id), 6000);
  }, [dismiss]);

  return (
    <Ctx.Provider value={{ toast }}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex flex-col items-center gap-2 px-4 lg:bottom-6">
        {items.map((t) => (
          <div key={t.id} className="pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-2xl bg-ink px-4 py-2 text-sm text-white shadow-pop">
            <CheckCircle2 size={18} className="shrink-0 text-[#F5B070]" />
            <span className="flex-1 py-1.5">{t.message}</span>
            {t.action && (
              <button
                onClick={() => { t.action!.onClick(); dismiss(t.id); }}
                className="min-h-11 rounded-lg px-3 font-semibold text-[#F5B070] hover:bg-white/10"
              >
                {t_(t.action.label)}
              </button>
            )}
            <button onClick={() => dismiss(t.id)} aria-label={t_("Dismiss")} className="flex h-11 w-11 items-center justify-center rounded-lg text-white/60 hover:bg-white/10">
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useToast() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useToast must be used inside ToastProvider");
  return c.toast;
}

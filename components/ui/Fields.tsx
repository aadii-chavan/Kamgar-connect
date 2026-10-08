import { useT } from "@/lib/i18n";
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "./cn";

export const inputCls =
  "min-h-11 w-full rounded-2xl border border-transparent bg-canvas px-4 text-sm text-ink placeholder:text-ink-mute hover:border-ink-mute/30 focus:bg-white transition-colors";

export function Field({ label, hint, error, children, htmlFor }: {
  label: string; hint?: string; error?: string; children: ReactNode; htmlFor?: string;
}) {
  const t = useT();
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-ink-soft">{t(label)}</label>
      {children}
      {error ? <p className="mt-1.5 text-xs font-medium text-bad-fg">{t(error)}</p> : hint ? <p className="mt-1.5 text-xs text-ink-mute">{t(hint)}</p> : null}
    </div>
  );
}

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(inputCls, className)} {...rest} />;
}
export function Select({ className, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(inputCls, "pr-8", className)} {...rest} />;
}
export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(inputCls, "min-h-[104px] resize-y py-3", className)} {...rest} />;
}

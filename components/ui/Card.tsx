import Link from "next/link";
import type { HTMLAttributes, ReactNode } from "react";
import { useT } from "@/lib/i18n";
import { cn } from "./cn";

export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("min-w-0 rounded-3xl bg-white shadow-card", className)} {...rest} />;
}

/** "View All" text link in a card header corner. */
export function CardPlus({ href, label }: { href: string; label: string }) {
  const t = useT();
  return (
    <Link href={href} aria-label={t(label)} className="-mr-2 flex min-h-11 items-center rounded-full px-3 text-[15px] text-ink-mute transition-colors hover:bg-canvas hover:text-ink">
      {t("View All")}
    </Link>
  );
}

export function CardHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode; icon?: ReactNode }) {
  const t = useT();
  return (
    <div className="flex items-start justify-between gap-4 px-6 pb-3 pt-6 md:px-8 md:pt-8">
      <div className="min-w-0">
        <h2 className="truncate text-[22px] font-normal leading-tight tracking-tight text-ink-soft">{t(title)}</h2>
        {subtitle && <p className="mt-1 truncate text-sm text-ink-mute">{t(subtitle)}</p>}
      </div>
      {action}
    </div>
  );
}

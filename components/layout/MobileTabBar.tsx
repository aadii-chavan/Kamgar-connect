"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useT } from "@/lib/i18n";
import { cn } from "../ui/cn";
import { isActive, type NavItem } from "./nav";

export function MobileTabBar({ nav }: { nav: NavItem[] }) {
  const pathname = usePathname();
  const t = useT();
  return (
    <nav
      aria-label={t("Main navigation")}
      className="fixed inset-x-3 bottom-3 z-30 flex rounded-full bg-ink/95 p-1.5 shadow-pop backdrop-blur lg:hidden"
      style={{ marginBottom: "env(safe-area-inset-bottom)" }}
    >
      {nav.filter((n) => n.mobile).map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href} href={href} aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 rounded-full text-[11px] transition-colors",
              active ? "bg-white text-ink" : "text-white/70",
            )}
          >
            <Icon size={20} strokeWidth={1.7} />
            <span className="max-w-full truncate px-1">{t(label)}</span>
          </Link>
        );
      })}
    </nav>
  );
}

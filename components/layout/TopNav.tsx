"use client";
import { Bell, HardHat, Search, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useT } from "@/lib/i18n";
import { useNotificationText } from "@/lib/live";
import { fmtClock } from "@/lib/time";
import { useStore, type Lang } from "@/lib/store";
import { cn } from "../ui/cn";
import { Segmented } from "../ui/Segmented";
import { ProfileMenu } from "./ProfileMenu";
import { isActive, type NavItem } from "./nav";

const LANGS: { id: Lang; label: string }[] = [
  { id: "en", label: "EN" }, { id: "hi", label: "हिं" }, { id: "mr", label: "मरा" },
];
const circle = "glass flex h-12 w-12 items-center justify-center rounded-full text-white transition-colors hover:bg-white/25";

function SearchToggle({ role }: { role: "Contractor" | "Worker" }) {
  const router = useRouter();
  const t = useT();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { if (open) input.current?.focus(); }, [open]);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const base = role === "Worker" ? "/worker/jobs" : "/jobs";
    router.push(q.trim() ? `${base}?q=${encodeURIComponent(q.trim())}` : base);
    setOpen(false);
  };
  return (
    <form onSubmit={submit} role="search" className="flex items-center gap-2">
      {open && (
        <input
          ref={input} value={q} onChange={(e) => setQ(e.target.value)} aria-label={t("Search")} placeholder={t("Search jobs, workers…")}
          onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
          className="glass min-h-12 w-36 rounded-full px-5 text-sm text-white placeholder:text-white/65 sm:w-60"
        />
      )}
      <button
        type={open && q ? "submit" : "button"} onClick={() => !q && setOpen((o) => !o)}
        aria-label={open ? t("Close search") : t("Search")} aria-expanded={open} className={circle}
      >
        {open && !q ? <X size={20} /> : <Search size={20} />}
      </button>
    </form>
  );
}

function BellMenu({ role }: { role: "Contractor" | "Worker" }) {
  const t = useT();
  const router = useRouter();
  const { notifications, markNotificationsRead } = useStore();
  const text = useNotificationText();
  const mine = notifications;
  const unread = mine.filter((n) => !n.read).length;
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);
  const toggle = () => { setOpen((o) => !o); if (!open) setTimeout(() => markNotificationsRead(), 1500); };
  return (
    <div ref={ref} className="relative">
      <button onClick={toggle} aria-label={unread ? t("Notifications, {n} unread", { n: unread }) : t("Notifications")} aria-expanded={open} className={cn(circle, "relative")}>
        <Bell size={20} />
        {unread > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#FFC857] px-1 text-[11px] font-medium text-ink tabular-nums ring-2 ring-[#8f2a14]">{unread > 9 ? "9+" : unread}</span>}
      </button>
      {open && (
        <div className="absolute right-0 top-14 z-40 max-h-[70vh] w-96 max-w-[calc(100vw-32px)] overflow-y-auto rounded-3xl bg-white p-3 text-ink shadow-pop">
          <div className="px-3 py-2 text-lg">{t("Notifications")}</div>
          {mine.length === 0 && <div className="px-3 py-6 text-center text-sm text-ink-mute">{t("Nothing new yet. Updates appear here the moment they happen.")}</div>}
          {mine.slice(0, 15).map((n) => (
            <button key={n.id} onClick={() => { setOpen(false); if (n.href) router.push(n.href); }} className="flex w-full items-start gap-3 rounded-2xl px-3 py-2.5 text-left hover:bg-canvas">
              <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", n.read ? "bg-transparent" : "bg-[#E0662B]")} />
              <span className="min-w-0 flex-1">
                <span className="block text-sm text-ink">{text(n)}</span>
                <span className="block text-xs tabular-nums text-ink-mute">{fmtClock(n.at)}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function TopNav({ nav, home, role, name, sub, minimal, profileHref, profileLabel }: {
  nav: NavItem[]; home: string; role: "Contractor" | "Worker"; name: string; sub: string; minimal?: boolean; profileHref?: string; profileLabel?: string;
}) {
  const pathname = usePathname();
  const { lang, setLang, applications } = useStore();
  const t = useT();
  const pending = applications.filter((a) => a.status === "pending").length;
  return (
    <header className="on-dark relative z-30 flex items-center justify-between gap-3 px-4 py-5 md:px-10 md:py-7">
      <Link href={home} aria-label="Kamgar" className="flex items-center gap-3 text-white">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-ink"><HardHat size={24} /></span>
        <span className="hidden text-2xl font-medium tracking-tight 2xl:block">Kamgar</span>
      </Link>

      {!minimal && <nav aria-label={t("Main navigation")} className="hidden min-w-0 flex-1 items-center justify-center gap-1 lg:flex">
        {nav.map(({ href, label, icon: Icon }) => {
          const on = isActive(pathname, href);
          return (
            <Link
              key={href} href={href} aria-current={on ? "page" : undefined} title={t(label)}
              className={cn("flex min-h-12 items-center gap-2 whitespace-nowrap rounded-full px-3 text-[15px] transition-colors xl:px-4", on ? "bg-white/20 text-white" : "text-white/85 hover:bg-white/10 hover:text-white")}
            >
              <Icon size={17} className="opacity-80" />
              <span className="max-xl:sr-only">{t(label)}</span>
              {role === "Contractor" && href === "/applicants" && pending > 0 && <span className="rounded-full bg-[#FFC857] px-1.5 text-xs font-medium text-ink tabular-nums">{pending}</span>}
            </Link>
          );
        })}
      </nav>}

      <div className="flex items-center gap-2">
        {!minimal && <SearchToggle role={role} />}
        <div className="max-sm:hidden"><Segmented<Lang> label="Language" options={LANGS} value={lang} onChange={setLang} compact glass /></div>
        {!minimal && <BellMenu role={role} />}
        <ProfileMenu name={name} sub={sub} role={role} profileHref={profileHref} profileLabel={profileLabel} />
      </div>
    </header>
  );
}


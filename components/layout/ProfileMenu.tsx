"use client";
import { LogOut, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { initials } from "@/lib/format";
import { useT } from "@/lib/i18n";
import { useStore, type Lang } from "@/lib/store";
import { Avatar } from "../ui/Avatar";
import { Segmented } from "../ui/Segmented";
import { useToast } from "../ui/Toast";

const LANGS: { id: Lang; label: string }[] = [
  { id: "en", label: "EN" }, { id: "hi", label: "हिं" }, { id: "mr", label: "मरा" },
];

/** Round profile button with a dropdown: who is signed in, language (on small screens) and log out. */
export function ProfileMenu({ name, sub, role, profileHref, profileLabel = "My Profile" }: { name: string; sub: string; role: "Contractor" | "Worker"; profileHref?: string; profileLabel?: string }) {
  const t = useT();
  const router = useRouter();
  const toast = useToast();
  const { logout, lang, setLang } = useStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const first = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    first.current?.focus();
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  const signOut = () => {
    setOpen(false);
    logout();
    router.replace("/login");
    toast(t("You have been logged out"));
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open} aria-label={t("Account menu")}
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-ink text-sm font-medium text-white ring-2 ring-transparent transition-shadow hover:ring-white/50"
      >
        {initials(t(name))}
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-14 z-40 w-72 max-w-[calc(100vw-32px)] rounded-3xl bg-white p-3 text-ink shadow-pop">
          <div className="flex items-center gap-3 px-2 py-2">
            <Avatar name={name} size={48} />
            <div className="min-w-0">
              <div className="truncate text-[17px]">{t(name)}</div>
              <div className="truncate text-sm text-ink-mute">{sub}</div>
              <span className="mt-1 inline-block rounded-full bg-canvas px-2.5 py-0.5 text-xs text-ink-soft">{t(role)}</span>
            </div>
          </div>
          <div className="mt-2 border-t border-line pt-2">
            <div className="px-2 pb-2 pt-1 sm:hidden">
              <div className="mb-1.5 text-xs text-ink-mute">{t("Language")}</div>
              <Segmented<Lang> label="Language" options={LANGS} value={lang} onChange={setLang} compact />
            </div>
            {profileHref && (
              <Link href={profileHref} role="menuitem" onClick={() => setOpen(false)} className="flex min-h-12 w-full items-center gap-3 rounded-2xl px-3 text-[15px] text-ink transition-colors hover:bg-canvas">
                <UserRound size={18} />{t(profileLabel)}
              </Link>
            )}
            <button
              ref={first} role="menuitem" onClick={signOut}
              className="flex min-h-12 w-full items-center gap-3 rounded-2xl px-3 text-[15px] text-bad-fg transition-colors hover:bg-bad-bg"
            >
              <LogOut size={18} />{t("Log out")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

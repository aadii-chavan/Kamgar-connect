"use client";
import { HardHat, Hammer, ShieldCheck, Wallet, CalendarCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Fields";
import { Segmented } from "@/components/ui/Segmented";
import { cn } from "@/components/ui/cn";
import { useT } from "@/lib/i18n";
import { useStore, type Lang, type Role } from "@/lib/store";
import { createClient } from "@/lib/supabase/client";

const LANGS: { id: Lang; label: string }[] = [
  { id: "en", label: "EN" }, { id: "hi", label: "हिं" }, { id: "mr", label: "मरा" },
];
const ROLES: { id: Role; icon: typeof HardHat; title: string; body: string }[] = [
  { id: "contractor", icon: HardHat, title: "Contractor", body: "Post jobs and manage a team" },
  { id: "worker", icon: Hammer, title: "Worker", body: "Find daily-wage work" },
];
const POINTS = [
  { icon: CalendarCheck, text: "Live attendance with photo proof" },
  { icon: Wallet, text: "Clear, on-time wage records" },
  { icon: ShieldCheck, text: "Fair pay for every worker" },
];

export default function LoginPage() {
  const t = useT();
  const router = useRouter();
  const { session, lang, setLang } = useStore();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [role, setRole] = useState<Role>("contractor");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (session) router.replace(session === "worker" ? "/worker" : "/");
  }, [session, router]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(""); setNotice("");
    if (mode === "signup" && !name.trim()) return setError("Enter your full name");
    if (password.length < 6) return setError("Password must be at least 6 characters");
    setBusy(true);
    const supabase = createClient();
    if (mode === "signin") {
      const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (err) setError(err.message);
    } else {
      const { data, error: err } = await supabase.auth.signUp({ email: email.trim(), password, options: { data: { role, full_name: name.trim() } } });
      if (err) setError(err.message);
      else if (!data.session) { setNotice("Check your email and confirm your address, then sign in."); setMode("signin"); }
    }
    setBusy(false);
  };

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      <aside className="on-dark hidden flex-col justify-between p-12 lg:flex">
        <span className="flex items-center gap-3 text-white">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-ink"><HardHat size={24} /></span>
          <span className="text-2xl font-medium tracking-tight">Kamgar</span>
        </span>
        <div>
          <h1 className="max-w-md text-[56px] font-medium leading-[1.02] tracking-[-0.04em] text-white">{t("Daily-wage work, made simple")}</h1>
          <ul className="mt-10 space-y-4">
            {POINTS.map((p) => (
              <li key={p.text} className="flex items-center gap-3 text-lg text-white/85"><p.icon size={20} aria-hidden />{t(p.text)}</li>
            ))}
          </ul>
        </div>
        <p className="text-sm text-white/60">© Kamgar</p>
      </aside>

      <main className="flex flex-col bg-canvas px-4 py-6 md:px-10">
        <div className="flex items-center justify-between lg:justify-end">
          <span className="flex items-center gap-2 lg:hidden"><HardHat size={22} /><span className="text-xl font-medium">Kamgar</span></span>
          <Segmented<Lang> label="Language" options={LANGS} value={lang} onChange={setLang} compact />
        </div>

        <div className="mx-auto flex w-full max-w-[440px] flex-1 flex-col justify-center py-10">
          <h2 className="text-[34px] font-medium tracking-tight">{t(mode === "signin" ? "Sign in to Kamgar" : "Create your account")}</h2>
          <p className="mt-2 text-ink-soft">{t(mode === "signin" ? "Welcome back. Enter your details to continue." : "Choose how you will use Kamgar.")}</p>

          <form onSubmit={submit} className="mt-8 space-y-5" noValidate>
            {mode === "signup" && (
              <>
                <div role="radiogroup" aria-label={t("I am a")} className="grid grid-cols-2 gap-3">
                  {ROLES.map((r) => (
                    <button key={r.id} type="button" role="radio" aria-checked={role === r.id} onClick={() => setRole(r.id)}
                      className={cn("rounded-2xl p-4 text-left ring-1 transition-colors", role === r.id ? "bg-ink text-white ring-ink" : "bg-white text-ink ring-line hover:bg-white/70")}>
                      <r.icon size={22} strokeWidth={1.6} />
                      <div className="mt-3 text-[17px]">{t(r.title)}</div>
                      <div className={cn("text-xs", role === r.id ? "text-white/75" : "text-ink-mute")}>{t(r.body)}</div>
                    </button>
                  ))}
                </div>
                <Field label="Full name" htmlFor="name"><Input id="name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" /></Field>
              </>
            )}
            <Field label="Email" htmlFor="email"><Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required /></Field>
            <Field label="Password" htmlFor="password"><Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "signin" ? "current-password" : "new-password"} required /></Field>

            {error && <p role="alert" className="rounded-2xl bg-bad-bg px-4 py-3 text-sm text-bad-fg">{t(error)}</p>}
            {notice && <p role="status" className="rounded-2xl bg-ok-bg px-4 py-3 text-sm text-ok-fg">{t(notice)}</p>}

            <Button type="submit" variant="primary" disabled={busy || !email || !password} className="!min-h-14 w-full">
              {busy ? t("Please wait…") : t(mode === "signin" ? "Sign in" : "Create account")}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-ink-soft">
            {t(mode === "signin" ? "New to Kamgar?" : "Already have an account?")}{" "}
            <button type="button" onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(""); setNotice(""); }} className="underline underline-offset-4 hover:text-ink">
              {t(mode === "signin" ? "Create an account" : "Sign in")}
            </button>
          </p>
        </div>
      </main>
    </div>
  );
}

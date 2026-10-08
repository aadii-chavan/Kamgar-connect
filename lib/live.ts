"use client";
import { useEffect, useState } from "react";
import { useT } from "./i18n";
import { fmtClock } from "./time";
import type { AppNotification } from "@/data/types";

/** The current time in epoch ms, ticking every second (or `ms`). Only components that show live data subscribe, so the rest of the app stays still. */
export function useNow(ms = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

/** Turn a stored notification into text in the current language. */
export function useNotificationText() {
  const t = useT();
  return (n: AppNotification) => {
    const vars: Record<string, string | number> = {};
    for (const [k, v] of Object.entries(n.vars)) vars[k] = typeof v === "string" ? t(v) : v;
    return t(n.key, vars);
  };
}

export const clockLabel = fmtClock;

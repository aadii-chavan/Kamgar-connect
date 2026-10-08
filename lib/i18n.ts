"use client";
import { useCallback } from "react";
import { DICT } from "./dict";
import type { Lang } from "./format";
import { useStore } from "./store";

const warned = new Set<string>();
type Vars = Record<string, string | number>;

/** English text is the key. Missing translations fall back to the English text (e.g. user-typed job titles). */
export function translate(lang: Lang, key: string, vars?: Vars) {
  const entry = lang === "en" ? undefined : DICT[key];
  if (process.env.NODE_ENV !== "production" && lang !== "en" && !entry && /[A-Za-z]{2}/.test(key) && !/\d|₹/.test(key) && !warned.has(key)) {
    warned.add(key);
    console.warn("[i18n-missing] " + key);
  }
  const text = entry ? entry[lang === "hi" ? 0 : 1] : key;
  return vars ? text.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? "")) : text;
}

export function useT() {
  const { lang } = useStore();
  return useCallback((key: string, vars?: Vars) => translate(lang, key, vars), [lang]);
}

export type TFn = ReturnType<typeof useT>;

/** Singular / plural helper: `tn(t, n, "{n} worker", "{n} workers")` */
export const tn = (t: TFn, n: number, one: string, other: string, vars?: Vars) =>
  t(n === 1 ? one : other, { n, ...vars });

import type { PaymentRecord } from "@/data/types";
import { TODAY, addDays } from "./format";

export type Range = "year" | "month" | "week";
export interface Bar { value: number; end: string }

/** Sum a per-day amount into the bars for a range: 7 days, 30 days, or 52 weeks ending today. */
export function bucketSeries(range: Range, byDate: Record<string, number>): Bar[] {
  const [n, step] = range === "week" ? [7, 1] : range === "month" ? [30, 1] : [52, 7];
  return Array.from({ length: n }, (_, i) => {
    const end = addDays(TODAY, -(n - 1 - i) * step);
    let value = 0;
    for (let d = 0; d < step; d++) value += byDate[addDays(end, -d)] ?? 0;
    return { end, value };
  });
}

/** What a contractor has paid out, by the day it was paid. */
export function payrollSeries(range: Range, payments: PaymentRecord[]): Bar[] {
  const byDate: Record<string, number> = {};
  for (const p of payments) byDate[p.paidOn] = (byDate[p.paidOn] ?? 0) + p.amount;
  return bucketSeries(range, byDate);
}

/** What a worker earned, by day. */
export const earningsSeries = bucketSeries;

export function niceTop(max: number) {
  const steps = [1000, 2000, 2500, 5000, 10000, 20000, 25000, 50000, 100000];
  const step = steps.find((s) => max / s <= 4) ?? 100000;
  return { step, top: Math.ceil(max / step) * step };
}

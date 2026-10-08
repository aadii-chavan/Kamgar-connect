"use client";
import { ChevronDown, Upload } from "lucide-react";
import { useMemo, useState, type KeyboardEvent } from "react";
import { formatDate, formatShort, weekday, formatINR } from "@/lib/format";
import { useT } from "@/lib/i18n";
import { niceTop, payrollSeries, type Bar, type Range } from "@/lib/series";
import { cn } from "../ui/cn";
import { Money } from "../ui/Money";
import { downloadCsv } from "@/lib/download";
import { useStore } from "@/lib/store";

const SHADES = ["#15110E", "#2C2622", "#4B443E", "#7C746D"];
const monthIdx = (iso: string) => Number(iso.slice(5, 7));

interface Props {
  title?: string;
  getSeries?: (range: Range) => Bar[];
  captions?: Record<Range, string>;
}
const PAYROLL_CAPTIONS: Record<Range, string> = {
  year: "Paid out in the last 12 months", month: "Paid out in the last 30 days", week: "Paid out in the last 7 days",
};

export function OverviewChart({ title = "Payroll overview", getSeries, captions = PAYROLL_CAPTIONS }: Props) {
  const t = useT();
  const { payments } = useStore();
  const [range, setRange] = useState<Range>("year");
  const bars = useMemo(() => (getSeries ? getSeries(range) : payrollSeries(range, Object.values(payments))), [range, getSeries, payments]);
  const [hover, setHover] = useState<number | null>(null);
  const active = Math.min(hover ?? bars.length - 1, bars.length - 1);

  const total = bars.reduce((s, b) => s + b.value, 0);
  const max = Math.max(...bars.map((b) => b.value), 1);
  const { step, top } = niceTop(max);
  const ticks = Array.from({ length: Math.round(top / step) }, (_, i) => top - i * step);

  const cur = bars[active];
  const prev = bars[active - 1];
  const change = prev && prev.value > 0 ? ((cur.value - prev.value) / prev.value) * 100 : null;
  const barW = range === "year" ? 3 : range === "month" ? 7 : 30;
  const leftPct = ((active + 0.5) / bars.length) * 100;
  const align = leftPct < 16 ? "start" : leftPct > 84 ? "end" : "mid";

  const xLabels = bars.map((b, i) => {
    if (range === "week") return weekday(b.end);
    if (range === "month") return (bars.length - 1 - i) % 5 === 0 ? formatShort(b.end) : "";
    return i === 0 || monthIdx(b.end) !== monthIdx(bars[i - 1].end) ? formatShort(b.end).split(" ").slice(1).join(" ") : "";
  });

  const onKey = (e: KeyboardEvent) => {
    if (e.key === "ArrowLeft") { e.preventDefault(); setHover(Math.max(0, active - 1)); }
    if (e.key === "ArrowRight") { e.preventDefault(); setHover(Math.min(bars.length - 1, active + 1)); }
  };
  const desc = range === "year" ? t("for week ending {date}", { date: formatDate(cur.end) }) : formatDate(cur.end);

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-[22px] font-normal tracking-tight text-ink-soft">{t(title)}</h2>
        <div className="flex items-center gap-2">
          <div className="relative">
            <select
              value={range} onChange={(e) => { setRange(e.target.value as Range); setHover(null); }} aria-label={t("Range")}
              className="min-h-12 appearance-none rounded-full bg-canvas py-0 pl-5 pr-11 text-[15px] text-ink hover:bg-accent-tint"
            >
              <option value="year">{t("Year")}</option><option value="month">{t("Month")}</option><option value="week">{t("Week")}</option>
            </select>
            <ChevronDown size={16} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-ink-soft" />
          </div>
          <button onClick={() => downloadCsv(`${title.toLowerCase().replace(/\s+/g, "-")}-${range}.csv`, [["Period ending", "Amount (INR)"], ...bars.map((b) => [b.end, b.value])])} aria-label={t("Export report")} className="flex h-12 w-12 items-center justify-center rounded-full bg-canvas text-ink hover:bg-accent-tint"><Upload size={18} /></button>
        </div>
      </div>

      <div className="mt-3 text-[48px] font-normal leading-none tracking-tight text-ink md:text-[60px]"><Money value={total} /></div>
      <div className="mt-2 text-sm text-ink-mute">{t(captions[range])}</div>

      <div
        className="mt-6 flex gap-3 rounded-2xl outline-offset-4" tabIndex={0} onKeyDown={onKey} onBlur={() => setHover(null)}
        role="group" aria-label={t("Bars. Use the left and right arrow keys to inspect.")}
      >
        <div className="flex h-[260px] shrink-0 flex-col justify-between pb-0 text-[15px] text-ink-soft" aria-hidden>
          {ticks.map((v) => <span key={v}>{v >= 1000 ? `${v / 1000}k` : v}</span>)}
          <span className="opacity-0">0</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="relative h-[260px]" onMouseLeave={() => setHover(null)}>
            <div className="absolute inset-0 flex items-end">
              {bars.map((b, i) => {
                const d = Math.abs(i - active);
                return (
                  <div key={b.end} onMouseEnter={() => setHover(i)} className="flex h-full flex-1 cursor-pointer items-end justify-center">
                    <span
                      className="block rounded-full transition-colors"
                      style={{ width: barW, height: `${Math.max(b.value / top, 0.015) * 100}%`, background: d < SHADES.length ? SHADES[d] : "#DDD6CE" }}
                    />
                  </div>
                );
              })}
            </div>
            <div
              className="pointer-events-none absolute z-10 w-max max-w-[240px] rounded-3xl bg-ink px-5 py-4 text-white shadow-pop"
              style={{
                left: align === "start" ? 0 : align === "end" ? "auto" : `${leftPct}%`, right: align === "end" ? 0 : "auto",
                transform: align === "mid" ? "translateX(-50%)" : undefined,
                bottom: `calc(${Math.max(cur.value / top, 0.015) * 100}% + 16px)`,
              }}
            >
              <div className="flex items-center gap-2.5">
                <span className="text-2xl tabular-nums">₹{cur.value.toLocaleString("en-IN")}<span className="opacity-40">.00</span></span>
                {change !== null && (
                  <span className="whitespace-nowrap rounded-full bg-white px-2.5 py-0.5 text-sm text-ink tabular-nums">{change >= 0 ? "↗" : "↘"} {Math.abs(change).toFixed(2)}%</span>
                )}
              </div>
              <div className="mt-1 text-sm text-white/80">{desc}</div>
              {align === "mid" && <span className="absolute left-1/2 top-full h-0 w-0 -translate-x-1/2 border-x-8 border-t-8 border-x-transparent border-t-ink" aria-hidden />}
            </div>
          </div>
          <div className="mt-3 flex" aria-hidden>
            {xLabels.map((l, i) => (
              <span key={i} className={cn("flex-1 text-center text-[15px] text-ink-soft", range === "year" && "overflow-visible whitespace-nowrap")} style={range === "year" ? { width: 0, flex: "1 1 0", textAlign: "left" } : undefined}>{l}</span>
            ))}
          </div>
        </div>
      </div>
      <p className="sr-only" aria-live="polite">{formatINR(cur.value)}, {desc}</p>
    </div>
  );
}

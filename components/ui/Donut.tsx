export interface DonutSlice { label: string; value: number; color: string }

import { useT } from "@/lib/i18n";

export function Donut({ slices, center, caption }: { slices: DonutSlice[]; center: string; caption: string }) {
  const t = useT();
  const total = slices.reduce((s, x) => s + x.value, 0);
  const r = 50, c = 2 * Math.PI * r, gap = total > 0 && slices.filter((s) => s.value > 0).length > 1 ? 2 : 0;
  let offset = 0;
  return (
    <svg viewBox="0 0 140 140" className="h-36 w-36 shrink-0" role="img" aria-label={`${t(caption)}: ${slices.map((s) => `${s.value} ${t(s.label)}`).join(", ")}`}>
      <circle cx="70" cy="70" r={r} fill="none" stroke="#F1ECE6" strokeWidth="18" />
      {slices.filter((s) => s.value > 0).map((s) => {
        const len = (s.value / total) * c;
        const el = (
          <circle
            key={s.label} cx="70" cy="70" r={r} fill="none" stroke={s.color} strokeWidth="18"
            strokeDasharray={`${Math.max(len - gap, 0)} ${c - Math.max(len - gap, 0)}`} strokeDashoffset={-offset}
            transform="rotate(-90 70 70)"
          />
        );
        offset += len;
        return el;
      })}
      <text x="70" y="68" textAnchor="middle" className="fill-ink text-[24px] font-medium">{center}</text>
      <text x="70" y="84" textAnchor="middle" className="fill-ink-mute text-[10px]">{t(caption)}</text>
    </svg>
  );
}

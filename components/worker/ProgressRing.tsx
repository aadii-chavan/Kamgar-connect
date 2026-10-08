import { cn } from "../ui/cn";

/** Circular completion meter. */
export function ProgressRing({ value, size = 120, stroke = 12, className, label }: { value: number; size?: number; stroke?: number; className?: string; label?: string }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className={cn("relative shrink-0", className)} style={{ width: size, height: size }} role="img" aria-label={`${label ?? ""} ${v}%`.trim()}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#EFE9E2" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} strokeLinecap="round"
          stroke={v >= 90 ? "#1C7F45" : "url(#ringGrad)"} strokeDasharray={`${(v / 100) * c} ${c}`} className="transition-all duration-700"
        />
        <defs><linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#F2A254" /><stop offset="100%" stopColor="#D9531E" /></linearGradient></defs>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center font-normal tabular-nums tracking-tight text-ink" style={{ fontSize: size * 0.27 }}>
        {v}<span className="opacity-40" style={{ fontSize: size * 0.17 }}>%</span>
      </div>
    </div>
  );
}

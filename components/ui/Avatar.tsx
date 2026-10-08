import { initials } from "@/lib/format";
import { useT } from "@/lib/i18n";
import { cn } from "./cn";

const PALETTE = ["#E0662B", "#3B82C4", "#1C9A63", "#7C5CD6", "#D6455D", "#C98A12", "#1B9AAA", "#4F5BD5"];
const pick = (name: string) => PALETTE[[...name].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % PALETTE.length];

export function Avatar({ name, size = 40, className }: { name: string; size?: number; className?: string }) {
  const t = useT();
  const c = pick(name);
  return (
    <span
      aria-hidden
      style={{ width: size, height: size, fontSize: Math.max(11, size * 0.34), background: `${c}1F`, color: c }}
      className={cn("inline-flex shrink-0 items-center justify-center rounded-full font-medium", className)}
    >
      {initials(t(name))}
    </span>
  );
}

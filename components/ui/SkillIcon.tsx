import { skillStyle } from "@/lib/skill";
import { cn } from "./cn";

/** Flat, softly tinted circle with a coloured glyph. */
export function SkillIcon({ skill, size = 44, className }: { skill: string; size?: number; className?: string }) {
  const s = skillStyle(skill);
  const Icon = s.icon;
  return (
    <span
      aria-hidden
      style={{ width: size, height: size, background: `${s.bg}22`, color: s.bg }}
      className={cn("inline-flex shrink-0 items-center justify-center rounded-full", className)}
    >
      <Icon size={Math.round(size * 0.46)} strokeWidth={1.9} />
    </span>
  );
}

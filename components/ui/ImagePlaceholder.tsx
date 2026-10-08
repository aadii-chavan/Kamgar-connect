import { SkillIcon } from "./SkillIcon";
import { cn } from "./cn";

/** Shown where a picture has not been added yet: a soft tile with the trade's icon. */
export function ImagePlaceholder({ skill, label, className }: { skill: string; label?: string; className?: string }) {
  return (
    <div role="img" aria-label={label} className={cn("flex h-full w-full flex-col items-center justify-center gap-2 bg-canvas", className)}>
      <SkillIcon skill={skill} size={52} />
      {label && <span className="px-3 text-center text-xs text-ink-mute">{label}</span>}
    </div>
  );
}

import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "dark" | "light" | "onDark";
type Size = "md" | "sm";

const variants: Record<Variant, string> = {
  primary: "bg-ink text-white hover:bg-accent-hover active:translate-y-px",
  secondary: "bg-white text-ink shadow-badge ring-1 ring-line hover:bg-canvas",
  ghost: "text-ink-soft hover:bg-black/5",
  danger: "bg-bad-bg text-bad-fg hover:brightness-95",
  dark: "bg-canvas text-ink hover:bg-accent-tint",
  light: "bg-white text-ink hover:bg-white/90 active:translate-y-px",
  onDark: "bg-white/15 text-white ring-1 ring-white/25 hover:bg-white/25",
};
const sizes: Record<Size, string> = {
  md: "min-h-12 px-6 text-[15px]",
  sm: "min-h-11 md:min-h-9 px-4 text-sm",
};

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  href?: string;
  icon?: ReactNode;
}

export function Button({ variant = "secondary", size = "md", href, icon, className, children, ...rest }: Props) {
  const cls = cn(
    "inline-flex items-center justify-center gap-2 rounded-full font-medium whitespace-nowrap transition-all duration-150",
    "disabled:opacity-40 disabled:pointer-events-none",
    variants[variant], sizes[size], className,
  );
  if (href) {
    return (
      <Link href={href} className={cls} aria-label={rest["aria-label"]}>
        {icon}{children}
      </Link>
    );
  }
  return (
    <button type="button" className={cls} {...rest}>
      {icon}{children}
    </button>
  );
}

import { cn } from "./cn";

/** ₹1,91,900 with a faded ".00" tail, like the large figures in the reference. */
export function Money({ value, className, decimals = true }: { value: number; className?: string; decimals?: boolean }) {
  return (
    <span className={cn("tabular-nums", className)}>
      ₹{Math.round(value).toLocaleString("en-IN")}
      {decimals && <span className="opacity-40">.00</span>}
    </span>
  );
}

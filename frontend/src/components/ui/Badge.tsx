import type { HTMLAttributes } from "react";
import { cn } from "./utils";

type BadgeTone = "blue" | "teal" | "green" | "amber" | "red" | "slate";

const tones: Record<BadgeTone, string> = {
  blue: "bg-blue-500/12 text-blue-700 dark:text-blue-200",
  teal: "bg-teal-500/12 text-teal-700 dark:text-teal-200",
  green: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-200",
  amber: "bg-amber-500/14 text-amber-700 dark:text-amber-200",
  red: "bg-red-500/12 text-red-700 dark:text-red-200",
  slate: "bg-slate-500/12 text-slate-700 dark:text-slate-200",
};

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: BadgeTone;
};

export function Badge({ tone = "slate", className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex h-7 items-center rounded-full px-2.5 text-xs font-semibold",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}

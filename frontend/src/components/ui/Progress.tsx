import { cn } from "./utils";

type ProgressProps = {
  value: number;
  className?: string;
};

export function Progress({ value, className }: ProgressProps) {
  return (
    <div className={cn("h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800", className)}>
      <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${Math.min(value, 100)}%` }} />
    </div>
  );
}

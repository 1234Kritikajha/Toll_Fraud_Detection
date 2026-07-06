import type { LucideIcon } from "lucide-react";
import { ArrowUpRight } from "lucide-react";
import type { Metric } from "../../types";
import { Card } from "../ui/Card";
import { cn } from "../ui/utils";

type MetricCardProps = Metric & {
  icon: LucideIcon;
};

const toneClasses = {
  blue: "bg-blue-500/10 text-blue-600 dark:text-blue-300",
  teal: "bg-teal-500/10 text-teal-600 dark:text-teal-300",
  green: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
  amber: "bg-amber-500/10 text-amber-600 dark:text-amber-300",
  red: "bg-red-500/10 text-red-600 dark:text-red-300",
};

export function MetricCard({ label, value, trend, detail, tone = "blue", icon: Icon }: MetricCardProps) {
  return (
    <Card className="min-h-[138px]">
      <div className="flex items-start justify-between gap-3">
        <div className={cn("flex h-11 w-11 items-center justify-center rounded-lg", toneClasses[tone])}>
          <Icon size={22} />
        </div>
        {trend && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-300">
            <ArrowUpRight size={13} />
            {trend}
          </span>
        )}
      </div>
      <p className="mt-5 text-sm font-medium text-muted">{label}</p>
      <div className="mt-1 flex items-end justify-between gap-2">
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-right text-xs text-muted">{detail}</p>
      </div>
    </Card>
  );
}

import { cn } from "./utils";

export function StatusDot({ tone = "green", pulse = false }: { tone?: "green" | "amber" | "red" | "blue"; pulse?: boolean }) {
  const colors = {
    green: "bg-emerald-500",
    amber: "bg-amber-500",
    red: "bg-red-500",
    blue: "bg-blue-500",
  };

  return <span className={cn("inline-block h-2.5 w-2.5 rounded-full", colors[tone], pulse && "animate-pulse")} />;
}

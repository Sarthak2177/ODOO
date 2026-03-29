import { cn } from "@/lib/utils";

interface RiskBadgeProps {
  score: number;
  level: "low" | "medium" | "high";
  size?: "sm" | "lg";
}

const RiskBadge = ({ score, level, size = "sm" }: RiskBadgeProps) => {
  const colors = {
    low: "text-emerald-700 bg-emerald-50 border-emerald-200",
    medium: "text-amber-700 bg-amber-50 border-amber-200",
    high: "text-red-700 bg-red-50 border-red-200",
  };

  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 rounded-full border font-medium",
      colors[level],
      size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm"
    )}>
      <span className={cn(
        "w-1.5 h-1.5 rounded-full",
        level === "low" && "bg-emerald-500",
        level === "medium" && "bg-amber-500",
        level === "high" && "bg-red-500",
      )} />
      {score}%
    </span>
  );
};

export default RiskBadge;

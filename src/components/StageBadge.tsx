import { cn } from "@/lib/utils";

const stageConfig: Record<string, { label: string; className: string }> = {
  submitted: { label: "Pending", className: "bg-amber-50 text-amber-700 border border-amber-200" },
  manager_approved: { label: "Manager ✓", className: "bg-blue-50 text-blue-700 border border-blue-200" },
  finance_approved: { label: "Finance ✓", className: "bg-indigo-50 text-indigo-700 border border-indigo-200" },
  director_approved: { label: "Director ✓", className: "bg-violet-50 text-violet-700 border border-violet-200" },
  approved: { label: "Approved", className: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
  rejected: { label: "Rejected", className: "bg-red-50 text-red-700 border border-red-200" },
};

const StageBadge = ({ stage }: { stage: string }) => {
  const config = stageConfig[stage] ?? stageConfig.submitted;
  return (
    <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-medium", config.className)}>
      {config.label}
    </span>
  );
};

export default StageBadge;

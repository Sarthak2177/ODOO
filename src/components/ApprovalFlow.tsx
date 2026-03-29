import { motion } from "framer-motion";
import { Check, Clock, X } from "lucide-react";
import { cn } from "@/lib/utils";

const STAGES = ["Submitted", "Manager", "Finance", "Director", "Approved"];

interface ApprovalFlowProps {
  currentStage: string;
  rejected?: boolean;
}

const stageIndex = (stage: string) => {
  const map: Record<string, number> = {
    submitted: 0,
    manager_approved: 1,
    finance_approved: 2,
    director_approved: 3,
    approved: 4,
    rejected: -1,
  };
  return map[stage] ?? 0;
};

// Find the rejection point based on audit trail
const rejectionStageIndex = (stage: string, rejectedAt?: string) => {
  if (stage !== "rejected") return -1;
  const map: Record<string, number> = {
    Manager: 1,
    Finance: 2,
    Director: 3,
  };
  return map[rejectedAt || "Manager"] ?? 1;
};

const ApprovalFlow = ({ currentStage, rejected, rejectedAt }: ApprovalFlowProps & { rejectedAt?: string }) => {
  const current = stageIndex(currentStage);
  const rejIdx = rejectionStageIndex(currentStage, rejectedAt);

  return (
    <div className="flex items-center w-full gap-1">
      {STAGES.map((stage, i) => {
        const completed = !rejected && current >= i;
        const active = !rejected && current === i - 1;
        const isRejected = rejected && i === rejIdx;
        const beforeReject = rejected && i < rejIdx;

        return (
          <div key={stage} className="flex items-center flex-1 last:flex-none">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: i * 0.08, type: "spring", stiffness: 300 }}
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium shrink-0 transition-all duration-500",
                completed && "bg-success/15 text-success border-2 border-success/30",
                beforeReject && "bg-success/15 text-success border-2 border-success/30",
                isRejected && "bg-destructive/15 text-destructive border-2 border-destructive/30",
                !completed && !isRejected && !beforeReject && "bg-muted text-muted-foreground border-2 border-border"
              )}
            >
              {completed || beforeReject ? <Check className="w-4 h-4" /> : isRejected ? <X className="w-4 h-4" /> : <Clock className="w-3.5 h-3.5" />}
            </motion.div>
            {i < STAGES.length - 1 && (
              <div className="flex-1 h-0.5 mx-1 bg-border rounded-full overflow-hidden">
                <motion.div
                  className={cn(
                    "h-full rounded-full",
                    (completed || beforeReject) ? "bg-success" : isRejected ? "bg-destructive" : "bg-transparent"
                  )}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: (completed || beforeReject || isRejected) ? 1 : 0 }}
                  transition={{ delay: i * 0.08 + 0.05, duration: 0.4 }}
                  style={{ transformOrigin: "left" }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export const ApprovalFlowLabeled = ({ currentStage, rejected, rejectedAt }: ApprovalFlowProps & { rejectedAt?: string }) => {
  const current = stageIndex(currentStage);
  const rejIdx = rejectionStageIndex(currentStage, rejectedAt);

  return (
    <div className="space-y-2">
      <ApprovalFlow currentStage={currentStage} rejected={rejected} rejectedAt={rejectedAt} />
      <div className="flex w-full">
        {STAGES.map((stage, i) => {
          const completed = !rejected && current >= i;
          const isRejected = rejected && i === rejIdx;
          const beforeReject = rejected && i < rejIdx;
          return (
            <div key={stage} className={cn("flex-1 last:flex-none text-center", i === STAGES.length - 1 && "text-right")}>
              <span className={cn(
                "text-[10px] font-medium",
                (completed || beforeReject) ? "text-success" : isRejected ? "text-destructive" : "text-muted-foreground"
              )}>
                {stage}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ApprovalFlow;

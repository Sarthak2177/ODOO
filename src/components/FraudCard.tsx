import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

interface FraudCardProps {
  riskScore: number;
  riskLevel: "low" | "medium" | "high";
  reasons: string[];
}

const FraudCard = ({ riskScore, riskLevel, reasons }: FraudCardProps) => {
  const config = {
    low: { icon: CheckCircle, color: "text-emerald-600", ringColor: "#22C55E", bg: "bg-emerald-500", cardBg: "bg-emerald-50 border-emerald-200" },
    medium: { icon: AlertTriangle, color: "text-amber-600", ringColor: "#F59E0B", bg: "bg-amber-500", cardBg: "bg-amber-50 border-amber-200" },
    high: { icon: ShieldAlert, color: "text-red-600", ringColor: "#EF4444", bg: "bg-red-500", cardBg: "bg-red-50 border-red-200" },
  }[riskLevel];

  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 200 }}
      className={cn("rounded-xl border p-5", config.cardBg)}
    >
      <div className="flex items-start gap-4">
        <div className="relative">
          <svg className="w-20 h-20" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="35" fill="none" stroke="currentColor" className="text-border" strokeWidth="6" />
            <motion.circle
              cx="40" cy="40" r="35" fill="none"
              stroke={config.ringColor}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={220}
              initial={{ strokeDashoffset: 220 }}
              animate={{ strokeDashoffset: 220 - (220 * riskScore) / 100 }}
              transition={{ duration: 1, ease: "easeOut" }}
              transform="rotate(-90 40 40)"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={cn("text-lg font-bold", config.color)}>{riskScore}</span>
          </div>
        </div>

        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <Icon className={cn("w-4 h-4", config.color)} />
            <span className={cn("text-sm font-semibold", config.color)}>
              {riskLevel === "low" ? "Low Risk" : riskLevel === "medium" ? "Medium Risk" : "High Risk"}
            </span>
          </div>
          <div className="space-y-1">
            {reasons.map((r, i) => (
              <motion.p
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.1 }}
                className="text-xs text-foreground/70 flex items-center gap-1.5"
              >
                <span className={cn("w-1 h-1 rounded-full shrink-0", config.bg)} />
                {r}
              </motion.p>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default FraudCard;

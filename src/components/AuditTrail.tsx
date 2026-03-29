import { motion } from "framer-motion";
import type { AuditEntry } from "@/data/mockData";

const AuditTrail = ({ entries }: { entries: AuditEntry[] }) => (
  <div className="relative pl-6">
    <div className="absolute left-2.5 top-2 bottom-2 w-px bg-border" />
    {entries.map((entry, i) => (
      <motion.div
        key={i}
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: i * 0.15 }}
        className="relative pb-4 last:pb-0"
      >
        <div className="absolute -left-[14px] top-1.5 w-2.5 h-2.5 rounded-full bg-primary border-2 border-card" />
        <p className="text-sm font-medium text-foreground">{entry.action}</p>
        <p className="text-xs text-muted-foreground">
          {entry.by} · {entry.timestamp}
        </p>
        {entry.comment && (
          <p className="text-xs text-destructive mt-1 italic bg-destructive/5 rounded px-2 py-1 border border-destructive/10">"{entry.comment}"</p>
        )}
      </motion.div>
    ))}
  </div>
);

export default AuditTrail;

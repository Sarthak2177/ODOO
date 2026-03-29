import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

interface GlassCardProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

const GlassCard = ({ children, className, hover = true, ...props }: GlassCardProps) => (
  <motion.div
    className={cn(
      "bg-card rounded-xl border border-border p-6 shadow-sm",
      hover && "transition-all duration-200 hover:shadow-md hover:border-primary/20",
      className
    )}
    {...props}
  >
    {children}
  </motion.div>
);

export default GlassCard;

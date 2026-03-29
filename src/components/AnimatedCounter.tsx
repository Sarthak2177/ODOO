import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface AnimatedCounterProps {
  target: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
}

const AnimatedCounter = ({ target, prefix = "", suffix = "", duration = 1.5 }: AnimatedCounterProps) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const increment = target / (duration * 60);
    const timer = setInterval(() => {
      start += increment;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 1000 / 60);
    return () => clearInterval(timer);
  }, [target, duration]);

  return (
    <motion.span
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="tabular-nums"
    >
      {prefix}{count.toLocaleString("en-IN")}{suffix}
    </motion.span>
  );
};

export default AnimatedCounter;

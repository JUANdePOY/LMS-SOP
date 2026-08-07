import { motion } from "framer-motion";
import { EASE, DURATION } from "./tokens";

export default function FadeIn({
  children,
  delay = 0,
  y = 10,
  duration = DURATION.base,
  className = "",
  as = "div",
}) {
  const Tag = motion[as] || motion.div;
  return (
    <Tag
      initial={{ opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration, ease: EASE.standard, delay }}
      className={className}
    >
      {children}
    </Tag>
  );
}

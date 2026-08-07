import { motion } from "framer-motion";
import { STAGGER } from "./tokens";

export function StaggerList({ children, className = "", staggerChildren = 0.05 }) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren, delayChildren: 0.04 } },
      }}
    >
      {children}
    </motion.div>
  );
}

export function MotionItem({ children, className = "", as = "div" }) {
  const Tag = motion[as] || motion.div;
  return (
    <Tag className={className} variants={STAGGER.item}>
      {children}
    </Tag>
  );
}

export default StaggerList;

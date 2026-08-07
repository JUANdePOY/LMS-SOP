import { motion } from "framer-motion";
import { PAGE_VARIANT, SHEET_VARIANT } from "./tokens";

const VARIANTS = {
  page: PAGE_VARIANT,
  sheet: SHEET_VARIANT,
};

export default function MotionFrame({ children, variant = "page", className = "" }) {
  const config = VARIANTS[variant] || PAGE_VARIANT;
  return (
    <motion.div
      initial="initial"
      animate="animate"
      className={className}
      variants={{
        initial: config.initial,
        animate: config.animate,
      }}
      transition={config.transition}
    >
      {children}
    </motion.div>
  );
}

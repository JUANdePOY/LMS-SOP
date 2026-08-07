import { useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { EASE, DURATION } from "./tokens";

export default function PageTransition({ children, className = "" }) {
  const location = useLocation();
  return (
    <motion.div
      key={location.pathname}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DURATION.base, ease: EASE.standard }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

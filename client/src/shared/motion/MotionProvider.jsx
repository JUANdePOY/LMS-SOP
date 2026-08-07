import { MotionConfig } from "framer-motion";

export default function MotionProvider({ children }) {
  return (
    <MotionConfig reducedMotion="user" transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}>
      {children}
    </MotionConfig>
  );
}

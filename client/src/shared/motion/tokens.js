export const EASE = {
  standard: [0.4, 0, 0.2, 1],
  emphasized: [0.2, 0, 0, 1],
  sharp: [0.4, 0, 1, 1],
};

export const DURATION = {
  fast: 0.15,
  base: 0.25,
  slow: 0.4,
};

export const SPRING = {
  type: "spring",
  stiffness: 260,
  damping: 30,
};

export const STAGGER = {
  container: {
    visible: {
      transition: { staggerChildren: 0.05, delayChildren: 0.04 },
    },
  },
  item: {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: DURATION.base, ease: EASE.standard },
    },
  },
};

export const PAGE_VARIANT = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: DURATION.base, ease: EASE.standard },
};

export const SHEET_VARIANT = {
  initial: { opacity: 0, scale: 0.98, y: 6 },
  animate: { opacity: 1, scale: 1, y: 0 },
  transition: { duration: DURATION.fast, ease: EASE.emphasized },
};

export default { EASE, DURATION, SPRING, STAGGER, PAGE_VARIANT, SHEET_VARIANT };

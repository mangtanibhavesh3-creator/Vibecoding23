/**
 * Apple OS-Inspired Spring Physics & Kinetic Motion Primitives
 * Designed for Framer Motion transitions across cards, reveals, and state changes.
 */

export const springGentle = {
  type: 'spring',
  stiffness: 120,
  damping: 15,
  mass: 0.8,
};

export const springBouncy = {
  type: 'spring',
  stiffness: 260,
  damping: 18,
  mass: 0.9,
};

export const springSnappy = {
  type: 'spring',
  stiffness: 380,
  damping: 28,
  mass: 1,
};

export const springStiff = {
  type: 'spring',
  stiffness: 500,
  damping: 35,
};

// Container stagger variants for cascading reveals
export const staggerContainer = (staggerChildren = 0.08, delayChildren = 0.04) => ({
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren,
      delayChildren,
    },
  },
});

// Single item fade-and-lift variant
export const fadeInUp = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: springSnappy,
  },
  exit: {
    opacity: 0,
    y: -12,
    transition: { duration: 0.18, ease: 'easeOut' },
  },
};

// Tactile card & button press physics
export const tactilePress = {
  initial: { scale: 1 },
  hover: { scale: 1.015, transition: springSnappy },
  tap: { scale: 0.975, transition: springSnappy },
};

// Seamless page transition configuration
export const pageTransition = {
  initial: { opacity: 0, y: 10 },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.35,
      ease: [0.16, 1, 0.3, 1],
    },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: { duration: 0.2, ease: 'easeIn' },
  },
};

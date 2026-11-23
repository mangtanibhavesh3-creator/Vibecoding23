import React from 'react';
import { motion } from 'framer-motion';
import { springSnappy } from '../../lib/motion.js';

/**
 * SplitHeading — React Bits-inspired kinetic staggered text reveal
 * Splits text into words or characters and animates each with high-precision spring physics.
 */
export const SplitHeading = ({
  text = '',
  as: Component = 'h1',
  className = '',
  stagger = 0.05,
  delay = 0,
}) => {
  const words = text.split(' ');

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: stagger,
        delayChildren: delay,
      },
    },
  };

  const wordVariants = {
    hidden: {
      opacity: 0,
      y: 20,
      filter: 'blur(6px)',
    },
    visible: {
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
      transition: springSnappy,
    },
  };

  return (
    <Component className={`overflow-hidden inline-flex flex-wrap gap-x-2 ${className}`}>
      <motion.span
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="inline-flex flex-wrap gap-x-2"
      >
        {words.map((word, index) => (
          <motion.span
            key={`${word}-${index}`}
            variants={wordVariants}
            className="inline-block will-change-transform"
          >
            {word}
          </motion.span>
        ))}
      </motion.span>
    </Component>
  );
};

export default SplitHeading;

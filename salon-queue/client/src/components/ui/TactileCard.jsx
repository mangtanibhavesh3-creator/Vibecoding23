import React from 'react';
import { motion } from 'framer-motion';
import { springSnappy } from '../../lib/motion.js';

/**
 * TactileCard — Minimalist glass/surface card with subtle spring hover/tap physics
 */
export const TactileCard = ({
  children,
  className = '',
  onClick,
  glow = false,
  interactive = false,
  variant = 'glass', // 'glass' | 'surface' | 'flat'
}) => {
  const baseClasses = 'relative rounded-2xl p-6 transition-colors duration-200 overflow-hidden';

  const variantClasses = {
    glass: 'bg-obsidian-900/80 backdrop-blur-xl border border-white/[0.08] shadow-glass-md',
    surface: 'bg-obsidian-850/90 border border-obsidian-700/60 shadow-glass-sm',
    flat: 'bg-obsidian-900/40 border border-white/[0.05]',
  };

  const glowClasses = glow
    ? 'ring-1 ring-brand-amber/30 shadow-amber-glow'
    : '';

  const Component = interactive || onClick ? motion.div : 'div';

  const motionProps = interactive || onClick
    ? {
        whileHover: { y: -3, scale: 1.008, transition: springSnappy },
        whileTap: { scale: 0.985, transition: springSnappy },
      }
    : {};

  return (
    <Component
      onClick={onClick}
      className={`${baseClasses} ${variantClasses[variant]} ${glowClasses} ${
        interactive || onClick ? 'cursor-pointer hover:border-brand-amber/30' : ''
      } ${className}`}
      {...motionProps}
    >
      {glow && (
        <div className="absolute -top-16 -right-16 w-32 h-32 bg-brand-amber/10 rounded-full blur-2xl pointer-events-none" />
      )}
      {children}
    </Component>
  );
};

export default TactileCard;

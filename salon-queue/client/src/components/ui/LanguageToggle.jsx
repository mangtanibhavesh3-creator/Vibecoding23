import React from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '../../context/LanguageContext.jsx';
import { springSnappy } from '../../lib/motion.js';

/**
 * LanguageToggle — Luxury pill toggle switching seamlessly between EN and ગુજરાતી
 */
export const LanguageToggle = ({ className = '' }) => {
  const { language, setLanguage } = useLanguage();

  return (
    <div
      className={`inline-flex items-center p-1 rounded-full bg-obsidian-900/90 border border-white/10 backdrop-blur-md shadow-glass-sm ${className}`}
      role="group"
      aria-label="Language Selector"
    >
      <button
        type="button"
        onClick={() => setLanguage('en')}
        className={`relative px-3.5 py-2 rounded-full text-xs font-semibold tracking-wide transition-colors z-10 min-h-[44px] min-w-[44px] flex items-center justify-center ${
          language === 'en' ? 'text-obsidian-950 font-bold' : 'text-slate-400 hover:text-white'
        }`}
      >
        {language === 'en' && (
          <motion.div
            layoutId="activeLangIndicator"
            className="absolute inset-0 bg-gradient-to-r from-brand-amber to-brand-glow rounded-full -z-10 shadow-sm"
            transition={springSnappy}
          />
        )}
        EN
      </button>

      <button
        type="button"
        onClick={() => setLanguage('gu')}
        className={`relative px-3.5 py-2 rounded-full text-xs font-semibold tracking-wide transition-colors z-10 min-h-[44px] min-w-[44px] flex items-center justify-center ${
          language === 'gu' ? 'text-obsidian-950 font-bold' : 'text-slate-400 hover:text-white'
        }`}
      >
        {language === 'gu' && (
          <motion.div
            layoutId="activeLangIndicator"
            className="absolute inset-0 bg-gradient-to-r from-brand-amber to-brand-glow rounded-full -z-10 shadow-sm"
            transition={springSnappy}
          />
        )}
        ગુજરાતી
      </button>
    </div>
  );
};

export default LanguageToggle;

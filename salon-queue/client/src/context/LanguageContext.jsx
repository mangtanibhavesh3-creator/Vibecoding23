import React, { createContext, useContext, useState, useEffect } from 'react';
import en from '../i18n/en.js';
import gu from '../i18n/gu.js';

const LanguageContext = createContext(null);

const dictionaries = { en, gu };

export const LanguageProvider = ({ children }) => {
  const [language, setLanguageState] = useState(() => {
    return localStorage.getItem('salon_language') || 'en';
  });

  const setLanguage = (lang) => {
    if (lang === 'en' || lang === 'gu') {
      setLanguageState(lang);
      localStorage.setItem('salon_language', lang);
      document.documentElement.lang = lang;
    }
  };

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'gu' : 'en');
  };

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  /**
   * Translation helper supporting dot notation keys (e.g. t('brand.name'))
   */
  const t = (keyPath, fallback = '') => {
    const keys = keyPath.split('.');
    let current = dictionaries[language];

    for (const key of keys) {
      if (current && current[key] !== undefined) {
        current = current[key];
      } else {
        // Fallback to English dictionary
        let enFallback = dictionaries.en;
        for (const fKey of keys) {
          if (enFallback && enFallback[fKey] !== undefined) {
            enFallback = enFallback[fKey];
          } else {
            return fallback || keyPath;
          }
        }
        return enFallback;
      }
    }

    return current;
  };

  const value = {
    language,
    isGujarati: language === 'gu',
    setLanguage,
    toggleLanguage,
    t,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export default LanguageContext;

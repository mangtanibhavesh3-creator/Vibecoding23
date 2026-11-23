import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Scissors, Sparkles } from 'lucide-react';
import { LanguageToggle } from '../ui/LanguageToggle.jsx';
import { useLanguage } from '../../context/LanguageContext.jsx';
import { useQueue } from '../../context/QueueContext.jsx';

export const AppShell = ({ children, hideNav = false }) => {
  const { t, isGujarati } = useLanguage();
  const { isConnected, salonConfig } = useQueue();
  const location = useLocation();

  const navLinks = [
    { to: '/', label: t('nav.home') },
    { to: '/join', label: t('nav.joinQueue') },
    { to: '/reception', label: t('nav.reception') },
    { to: '/barber/ravi', label: t('nav.barberStation') },
    { to: '/display', label: t('nav.displayTv') },
    { to: '/admin', label: t('nav.admin') },
  ];

  return (
    <div
      className={`min-h-screen flex flex-col bg-obsidian-950 text-slate-100 selection:bg-brand-amber/25 selection:text-brand-glow ${
        isGujarati ? 'gujarati-text' : 'font-sans'
      }`}
    >
      {/* Top Utility Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-obsidian-950/85 border-b border-white/[0.08] transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 py-3 flex items-center justify-between gap-3">
          {/* Brand Identity & Tactile Badge */}
          <Link
            to="/"
            className="flex items-center gap-3 group focus:outline-none min-h-[44px] min-w-[44px]"
            aria-label="Studio Kashi Salon Home"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-amber/25 via-brand-gold/15 to-transparent border border-brand-amber/40 flex items-center justify-center text-brand-amber shadow-amber-glow group-hover:scale-105 group-hover:border-brand-amber transition-all">
              <Scissors className="w-5 h-5 -rotate-45" />
            </div>
            <div className="flex flex-col">
              <span className="font-serif text-lg sm:text-xl tracking-tight text-white group-hover:text-brand-glow transition-colors leading-tight font-medium">
                {salonConfig?.salonNameEn || 'Studio Kashi Salon'}
              </span>
              <span className="text-[11px] font-gujarati text-slate-400 group-hover:text-slate-300 leading-tight">
                {salonConfig?.salonNameGu || 'સ્ટુડિયો કાશી સલૂન'}
              </span>
            </div>
          </Link>

          {/* Quick Route Nav (Desktop Viewports) */}
          {!hideNav && (
            <nav className="hidden lg:flex items-center gap-1 bg-obsidian-900/80 p-1 rounded-full border border-white/10 text-xs shadow-inner">
              {navLinks.map((link) => {
                const isActive = location.pathname === link.to;
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`min-h-[44px] px-3.5 py-2 rounded-full inline-flex items-center transition-all ${
                      isActive
                        ? 'bg-brand-amber/20 text-brand-glow font-semibold border border-brand-amber/30 shadow-sm'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          )}

          {/* Right Controls: Live Sync Indicator + Language Switcher */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Live Socket Status Dot */}
            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-obsidian-900/90 border border-white/10 text-xs select-none min-h-[44px]"
              title={isConnected ? 'Live sync connected' : 'Connecting to live socket...'}
            >
              <span className="relative flex h-2 w-2">
                {isConnected && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                )}
                <span
                  className={`relative inline-flex rounded-full h-2 w-2 ${
                    isConnected ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-slate-500'
                  }`}
                />
              </span>
              <span className={`text-[11px] font-medium hidden sm:inline ${isConnected ? 'text-emerald-300' : 'text-slate-400'}`}>
                {isConnected ? t('system.connected') : t('system.offline')}
              </span>
            </div>

            {/* Language Switcher Pill */}
            <LanguageToggle />
          </div>
        </div>

        {/* Mobile Navigation Strip */}
        {!hideNav && (
          <div className="lg:hidden flex items-center gap-1 px-4 py-2 overflow-x-auto border-t border-white/[0.05] scrollbar-none text-xs bg-obsidian-900/60">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.to;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`min-h-[44px] px-3 py-2.5 rounded-lg whitespace-nowrap text-xs inline-flex items-center transition-colors ${
                    isActive
                      ? 'bg-brand-amber/20 text-brand-glow font-medium border border-brand-amber/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        {children}
      </main>

      {/* Elegant Minimalist Footer */}
      <footer className="border-t border-white/[0.06] py-6 text-center text-xs text-slate-500 mt-auto bg-obsidian-950/60">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-slate-400">
            <Sparkles className="w-4 h-4 text-brand-amber" />
            <span className="font-serif text-sm tracking-wide text-slate-300">
              {salonConfig?.salonNameEn || 'Studio Kashi Salon'}
            </span>
            <span className="text-slate-600">·</span>
            <span className="text-xs">{t('brand.hours')}</span>
          </div>
          <p className="text-slate-500 text-[11px]">{t('footer.rights')}</p>
        </div>
      </footer>
    </div>
  );
};

export default AppShell;

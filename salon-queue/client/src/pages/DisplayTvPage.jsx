import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Scissors,
  Sparkles,
  Users,
  Clock,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  BellRing,
  CheckCircle2,
  Coffee,
  Radio,
  UserCheck,
  ChevronRight,
  Home,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext.jsx';
import { useQueue } from '../context/QueueContext.jsx';
import { LanguageToggle } from '../components/ui/LanguageToggle.jsx';
import socket from '../lib/socket.js';
import { playChime } from '../lib/audio.js';

export const DisplayTvPage = () => {
  const { t, isGujarati } = useLanguage();
  const {
    salonConfig,
    barbers,
    waitingTickets,
    calledTickets,
    inChairTickets,
    upNextTop5,
    isConnected,
  } = useQueue();

  // Clock state
  const [currentTime, setCurrentTime] = useState(new Date());

  // Sound state
  const [soundEnabled, setSoundEnabled] = useState(() => {
    try {
      return localStorage.getItem('salon_tv_sound') === 'true';
    } catch {
      return false;
    }
  });
  const soundEnabledRef = useRef(soundEnabled);
  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Active callout overlay state (lasts 6 seconds on ticket:called)
  const [highlightedCall, setHighlightedCall] = useState(null);

  // Clock timer
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fullscreen change listener
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Socket listener for 'ticket:called'
  useEffect(() => {
    let timeoutId = null;

    const handleTicketCalled = (payload) => {
      // payload: { ticketId, token, customerName, assignedBarber, barberName, timestamp }
      setHighlightedCall(payload);

      if (soundEnabledRef.current) {
        playChime();
      }

      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setHighlightedCall(null);
      }, 6000);
    };

    socket.on('ticket:called', handleTicketCalled);

    return () => {
      socket.off('ticket:called', handleTicketCalled);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  // Sound toggle handler
  const toggleSound = () => {
    const nextState = !soundEnabled;
    setSoundEnabled(nextState);
    try {
      localStorage.setItem('salon_tv_sound', String(nextState));
    } catch {}

    if (nextState) {
      playChime(); // Unmutes & unlocks AudioContext immediately
    }
  };

  // Fullscreen toggle handler
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch((err) => {
        console.warn('Could not enter fullscreen:', err);
      });
    } else {
      document.exitFullscreen?.().catch((err) => {
        console.warn('Could not exit fullscreen:', err);
      });
    }
  };

  // Format digital clock
  const timeFormatted = currentTime.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  const dateFormatted = currentTime.toLocaleDateString(isGujarati ? 'gu-IN' : 'en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  // Calculate active serving count
  const activeServingCount = barbers.filter((b) => {
    const hasInChair = inChairTickets.some((t) => t.assignedBarber === b.slug);
    const hasCalled = calledTickets.some((t) => t.assignedBarber === b.slug);
    return hasInChair || hasCalled;
  }).length;

  return (
    <div
      className={`min-h-screen w-full bg-[#0A0D0C] text-slate-100 flex flex-col justify-between p-4 sm:p-6 lg:p-8 select-none relative overflow-x-hidden ${
        isGujarati ? 'gujarati-text' : 'font-sans'
      }`}
    >
      {/* Ambient background glows */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[1100px] h-[340px] bg-gradient-to-b from-brand-amber/[0.07] via-brand-gold/[0.03] to-transparent blur-3xl pointer-events-none -z-0" />
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-[1200px] h-[320px] bg-gradient-to-t from-emerald-950/20 via-brand-amber/[0.05] to-transparent blur-3xl pointer-events-none -z-0" />

      {/* Floating 6-Second Callout Alert Overlay */}
      <AnimatePresence>
        {highlightedCall && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -30, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
            className="fixed top-4 sm:top-6 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-3xl pointer-events-none"
          >
            <div className="bg-gradient-to-r from-[#1d140b] via-[#16120e] to-[#1d140b] border-2 border-brand-amber/80 rounded-3xl p-5 sm:p-6 shadow-[0_0_60px_rgba(229,155,88,0.55)] backdrop-blur-2xl text-center relative overflow-hidden">
              {/* Animated top highlight shimmer */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-brand-gold to-transparent animate-shimmer" />

              <div className="flex items-center justify-center gap-2 mb-2 text-brand-gold font-mono text-xs sm:text-sm tracking-wider uppercase">
                <BellRing className="w-5 h-5 text-brand-amber animate-bounce" />
                <span>{t('tv.nowCalling')} · હવે બોલાવાય છે</span>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 my-2">
                <span className="text-4xl sm:text-6xl font-serif font-bold text-white tracking-tight drop-shadow-md">
                  {highlightedCall.token}
                </span>
                <span className="hidden sm:inline text-slate-500 text-2xl font-light">→</span>
                <span className="text-2xl sm:text-4xl font-serif text-brand-glow font-semibold">
                  {t('tv.goTo')} {highlightedCall.barberName}
                </span>
              </div>

              <p className="text-slate-300 text-sm sm:text-base font-medium mt-1">
                {highlightedCall.customerName}
                <span className="text-slate-500 mx-2">·</span>
                <span className="font-gujarati text-brand-amber/90">
                  {highlightedCall.barberName} પાસે ખુરશી પર પધારો
                </span>
              </p>

              {/* Auto-dismiss progress countdown line */}
              <motion.div
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: 6, ease: 'linear' }}
                className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-brand-amber to-brand-gold"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TOP HEADER BAR */}
      <header className="relative z-10 flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-white/[0.08]">
        {/* Left: Brand & Live Heartbeat */}
        <div className="flex items-center gap-3 sm:gap-4">
          <Link
            to="/"
            title="Return to Home"
            className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-brand-amber/25 via-brand-gold/15 to-transparent border border-brand-amber/40 flex items-center justify-center text-brand-amber shadow-amber-glow hover:scale-105 transition-transform"
          >
            <Scissors className="w-6 h-6 sm:w-7 sm:h-7 -rotate-45" />
          </Link>

          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-serif text-white tracking-tight font-medium">
                {salonConfig?.salonNameEn || 'Studio Kashi Salon'}
              </h1>
              <span className="text-xs text-slate-400 font-serif hidden md:inline">|</span>
              <span className="text-sm font-gujarati text-slate-300 hidden md:inline">
                {salonConfig?.salonNameGu || 'સ્ટુડિયો કાશી સલૂન'}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              {/* Pulsating green Live badge */}
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-mono font-semibold tracking-wider">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span>{t('tv.liveBadge')}</span>
              </div>
              <span className="text-slate-500 text-xs hidden sm:inline">·</span>
              <span className="text-slate-400 text-xs hidden sm:inline">
                {salonConfig?.taglineEn || 'Precision Grooming Lounge'}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Clock & Kiosk Controls */}
        <div className="flex items-center gap-3 sm:gap-4 ml-auto">
          {/* Real-time Clock readout */}
          <div className="flex flex-col items-end px-4 py-1.5 rounded-2xl bg-obsidian-900/80 border border-white/10 backdrop-blur-md">
            <span className="text-2xl sm:text-3xl font-mono font-bold text-white tracking-wider tabular-nums leading-tight">
              {timeFormatted}
            </span>
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-widest leading-none mt-0.5">
              {dateFormatted}
            </span>
          </div>

          {/* Sound Toggle (Audible Turn Chime) */}
          <button
            type="button"
            onClick={toggleSound}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl border text-xs font-medium transition-all ${
              soundEnabled
                ? 'bg-brand-amber/15 border-brand-amber/40 text-brand-glow shadow-amber-glow'
                : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
            }`}
            title={soundEnabled ? 'Audio Chime Enabled' : 'Click to Enable Audio Chime'}
          >
            {soundEnabled ? (
              <>
                <Volume2 className="w-4 h-4 text-brand-amber" />
                <span className="hidden sm:inline">{t('tv.soundOn')}</span>
              </>
            ) : (
              <>
                <VolumeX className="w-4 h-4 text-slate-400" />
                <span className="hidden sm:inline">{t('tv.soundMuted')}</span>
              </>
            )}
          </button>

          {/* Language Switcher */}
          <LanguageToggle />

          {/* Fullscreen Toggle */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            title={isFullscreen ? t('tv.exitFullscreen') : t('tv.fullscreen')}
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </button>

          {/* Home Link */}
          <Link
            to="/"
            className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Home"
          >
            <Home className="w-4 h-4" />
          </Link>
        </div>
      </header>

      {/* MAIN TWIN GLASS SPLIT (Now Serving vs. Up Next) */}
      <main className="relative z-10 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 my-5 sm:my-6">
        {/* LEFT COLUMN: NOW SERVING (60% / col-span-7) */}
        <section className="lg:col-span-7 flex flex-col space-y-4">
          <div className="flex items-center justify-between pb-1">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-brand-amber/15 border border-brand-amber/30 text-brand-amber">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-2xl sm:text-3xl font-serif text-brand-glow font-medium leading-tight">
                  {t('tv.nowServing')}
                </h2>
                <span className="text-xs font-gujarati text-slate-400">
                  {t('tv.nowServingGu')}
                </span>
              </div>
            </div>

            <div className="px-3.5 py-1.5 rounded-full bg-obsidian-900/90 border border-white/10 text-xs font-mono text-slate-300">
              <span className="text-brand-amber font-semibold">{activeServingCount}</span> /{' '}
              {barbers.length} Active Chairs
            </div>
          </div>

          {/* Barber Stations Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 flex-1">
            {barbers.map((barber) => {
              // Locate active ticket: in chair takes priority over called
              const activeInChair = inChairTickets.find((t) => t.assignedBarber === barber.slug);
              const activeCalled = calledTickets.find((t) => t.assignedBarber === barber.slug);
              const activeTicket =
                activeInChair ||
                activeCalled ||
                (barber.currentTicketId && typeof barber.currentTicketId === 'object'
                  ? barber.currentTicketId
                  : null);

              const isCalled = activeTicket?.status === 'called';
              const isInChair = activeTicket?.status === 'in_chair';
              const isOnBreak = barber.status === 'on_break';
              const isAvailable = barber.status === 'available' && !activeTicket;

              // Check if this barber is the one in the 6-second highlight callout
              const isHighlightActive = highlightedCall?.assignedBarber === barber.slug;

              return (
                <div
                  key={barber._id || barber.slug}
                  className={`rounded-3xl p-5 flex flex-col justify-between transition-all duration-500 relative overflow-hidden backdrop-blur-xl ${
                    isHighlightActive
                      ? 'bg-gradient-to-b from-amber-950/60 to-obsidian-900/90 border-2 border-brand-amber ring-4 ring-brand-amber/30 shadow-[0_0_50px_rgba(229,155,88,0.4)] scale-[1.02]'
                      : 'bg-obsidian-900/70 border border-white/10 hover:border-white/20'
                  }`}
                >
                  {/* Subtle top inner glow for highlighted chair */}
                  {isHighlightActive && (
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-amber via-brand-gold to-brand-amber animate-pulse" />
                  )}

                  {/* Station Header */}
                  <div className="flex items-start justify-between gap-2 border-b border-white/[0.08] pb-3">
                    <div>
                      <h3 className="text-xl sm:text-2xl font-serif font-bold text-white tracking-wide">
                        {barber.name}
                      </h3>
                      <p className="text-xs text-slate-400 font-medium">
                        {isGujarati ? barber.specialtyGu : barber.specialtyEn}
                      </p>
                    </div>

                    {/* Status Pill Badge */}
                    <div>
                      {isCalled && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-brand-amber/20 border border-brand-amber/50 text-brand-glow text-[11px] font-mono font-bold animate-pulse">
                          <BellRing className="w-3 h-3" />
                          <span>{t('tv.callingStatus')}</span>
                        </span>
                      )}
                      {isInChair && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 text-[11px] font-mono font-bold">
                          <UserCheck className="w-3 h-3" />
                          <span>{t('tv.inChairStatus')}</span>
                        </span>
                      )}
                      {isOnBreak && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300/80 text-[11px] font-mono font-medium">
                          <Coffee className="w-3 h-3" />
                          <span>{t('tv.onBreak')}</span>
                        </span>
                      )}
                      {isAvailable && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-slate-300 text-[11px] font-mono font-medium">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          <span>{t('status.available')}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Station Centerpiece: Active Customer or Idle State */}
                  <div className="py-6 my-auto text-center">
                    {activeTicket ? (
                      <div className="space-y-2">
                        <span className="text-[11px] uppercase font-mono tracking-widest text-slate-400">
                          {isCalled ? t('tv.nowCalling') : t('tv.now')}
                        </span>
                        {/* Huge high-contrast token */}
                        <div className="text-5xl sm:text-6xl lg:text-7xl font-serif font-bold text-brand-glow tracking-tight drop-shadow-md">
                          {activeTicket.token}
                        </div>
                        {/* Customer Name */}
                        <p className="text-xl sm:text-2xl font-medium text-white tracking-tight">
                          {activeTicket.customerName}
                        </p>
                      </div>
                    ) : isOnBreak ? (
                      <div className="space-y-2 py-4">
                        <Coffee className="w-10 h-10 text-amber-400/60 mx-auto" />
                        <p className="text-base font-serif text-slate-300">
                          {t('tv.onBreak')}
                        </p>
                        <p className="text-xs text-slate-500">
                          {t('tv.onBreakSub')}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2 py-4">
                        <CheckCircle2 className="w-10 h-10 text-emerald-400/60 mx-auto" />
                        <p className="text-lg font-serif text-emerald-300">
                          {t('tv.chairReady')}
                        </p>
                        <p className="text-xs text-slate-400 font-gujarati">
                          {t('tv.chairReadyGu')}
                        </p>
                        <p className="text-[11px] text-slate-500 font-sans">
                          {t('tv.chairReadySub')}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Station Footer / Service readout */}
                  <div className="border-t border-white/[0.08] pt-3 text-xs">
                    {activeTicket ? (
                      <div className="flex items-center justify-between text-slate-300">
                        <span className="truncate text-slate-400 font-medium">
                          {activeTicket.services
                            ?.map((s) => (isGujarati ? s.nameGu : s.nameEn))
                            .join(', ') || 'Service'}
                        </span>
                        <span className="font-mono text-brand-amber font-semibold ml-2 shrink-0">
                          {activeTicket.totalDurationMin}m
                        </span>
                      </div>
                    ) : (
                      <div className="text-slate-500 text-center font-mono text-[11px]">
                        Station {barber.name} · Open
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* RIGHT COLUMN: UP NEXT (40% / col-span-5) */}
        <section className="lg:col-span-5 flex flex-col space-y-4">
          <div className="flex items-center justify-between pb-1">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-300">
                <Users className="w-5 h-5 text-brand-amber" />
              </div>
              <div>
                <h2 className="text-2xl sm:text-3xl font-serif text-slate-200 font-medium leading-tight">
                  {t('tv.upNext')}
                </h2>
                <span className="text-xs font-gujarati text-slate-400">
                  {t('tv.upNextGu')}
                </span>
              </div>
            </div>

            <div className="px-3.5 py-1.5 rounded-full bg-obsidian-900/90 border border-white/10 text-xs font-mono text-slate-300">
              <span className="text-brand-amber font-semibold">{waitingTickets.length}</span>{' '}
              {t('tv.peopleWaitingBadge', { count: '' }).trim()}
            </div>
          </div>

          {/* Upcoming Tickets Container */}
          <div className="bg-obsidian-900/60 border border-white/10 rounded-3xl p-4 sm:p-5 flex-1 flex flex-col justify-between backdrop-blur-xl">
            {waitingTickets.length > 0 ? (
              <div className="space-y-2.5 flex-1 flex flex-col justify-around">
                {(upNextTop5.length > 0 ? upNextTop5 : waitingTickets.slice(0, 5)).map(
                  (ticket, idx) => {
                    const isFirst = idx === 0;
                    return (
                      <div
                        key={ticket._id || ticket.token}
                        className={`flex items-center justify-between p-3.5 sm:p-4 rounded-2xl transition-all ${
                          isFirst
                            ? 'bg-gradient-to-r from-obsidian-850 via-[#181a22] to-obsidian-850 border border-brand-amber/30 shadow-glass-sm'
                            : 'bg-obsidian-850/80 border border-white/[0.06]'
                        }`}
                      >
                        {/* Rank + Token Badge */}
                        <div className="flex items-center gap-3">
                          <span
                            className={`w-7 h-7 rounded-full flex items-center justify-center font-mono text-xs font-bold ${
                              isFirst
                                ? 'bg-brand-amber/25 text-brand-glow border border-brand-amber/40'
                                : 'bg-white/5 text-slate-400 border border-white/10'
                            }`}
                          >
                            {idx + 1}
                          </span>

                          <div>
                            <span className="text-xl sm:text-2xl font-serif font-bold text-brand-glow tracking-tight">
                              {ticket.token}
                            </span>
                          </div>
                        </div>

                        {/* Customer Name & Preferred Barber */}
                        <div className="flex-1 mx-3 text-left">
                          <p className="text-base sm:text-lg font-semibold text-white truncate max-w-[160px] sm:max-w-[200px]">
                            {ticket.customerName}
                          </p>
                          <p className="text-xs text-slate-400">
                            {ticket.preferredBarber === 'any'
                              ? t('join.anyBarber')
                              : `${t('tv.with')} ${
                                  barbers.find((b) => b.slug === ticket.preferredBarber)?.name ||
                                  ticket.preferredBarber
                                }`}
                          </p>
                        </div>

                        {/* Estimated Wait Pill */}
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-brand-amber font-mono font-bold text-xs sm:text-sm shrink-0">
                          <Clock className="w-3.5 h-3.5" />
                          <span>
                            ~{ticket.estimatedWaitMin || ticket.totalDurationMin || 10}m
                          </span>
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            ) : (
              /* Empty Queue State */
              <div className="my-auto text-center py-12 px-4 space-y-3">
                <div className="w-16 h-16 mx-auto rounded-3xl bg-brand-amber/10 border border-brand-amber/20 flex items-center justify-center text-brand-amber shadow-amber-glow">
                  <Sparkles className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-serif text-white">
                  {t('tv.emptyUpNext')}
                </h3>
                <p className="text-base font-gujarati text-brand-glow">
                  {t('tv.emptyUpNextGu')}
                </p>
                <p className="text-xs text-slate-400 font-sans max-w-sm mx-auto">
                  {t('tv.emptyUpNextSub')}
                </p>
              </div>
            )}

            {/* Total Waiting summary strip */}
            <div className="mt-3 pt-3 border-t border-white/[0.08] flex items-center justify-between text-xs text-slate-400">
              <span className="font-gujarati">
                કુલ પ્રતીક્ષારત ગ્રાહકો: {waitingTickets.length}
              </span>
              <span className="font-mono text-slate-400">
                Avg Service: ~{salonConfig?.defaultServiceTime || 20} min
              </span>
            </div>
          </div>
        </section>
      </main>

      {/* BOTTOM AMBIENT FOOTER BAR */}
      <footer className="relative z-10 pt-4 border-t border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <span className="font-serif text-slate-300 text-sm">Studio Kashi Salon</span>
          <span>·</span>
          <span>{t('brand.hours')}</span>
        </div>

        {/* Center Tagline */}
        <div className="flex items-center gap-2 text-center text-slate-300 font-medium">
          <span>{t('tv.thankYouNotice')}</span>
          <span className="text-brand-amber font-serif">✂</span>
          <span className="font-gujarati text-slate-300">{t('tv.thankYouNoticeGu')}</span>
        </div>

        {/* Live sync heartbeat */}
        <div className="flex items-center gap-2 font-mono text-[11px]">
          <span className="relative flex h-2 w-2">
            <span
              className={`relative inline-flex rounded-full h-2 w-2 ${
                isConnected ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-slate-500'
              }`}
            />
          </span>
          <span className={isConnected ? 'text-emerald-400' : 'text-slate-400'}>
            {isConnected ? 'LIVE SYNC ACTIVE' : 'CONNECTING...'}
          </span>
        </div>
      </footer>
    </div>
  );
};

export default DisplayTvPage;

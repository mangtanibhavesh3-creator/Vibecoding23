import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Scissors,
  Clock,
  User,
  CheckCircle2,
  Play,
  Check,
  Coffee,
  Sparkles,
  AlertCircle,
  Loader2,
  Radio,
  ArrowRight,
} from 'lucide-react';
import { StaffPinGate } from '../components/auth/StaffPinGate.jsx';
import { LanguageToggle } from '../components/ui/LanguageToggle.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import { useQueue } from '../context/QueueContext.jsx';
import { api, getStaffHeaders } from '../lib/api.js';
import { springSnappy, fadeInUp } from '../lib/motion.js';

export const BarberPage = () => {
  return (
    <StaffPinGate>
      <BarberStationTerminal />
    </StaffPinGate>
  );
};

const BarberStationTerminal = () => {
  const { name } = useParams();
  const navigate = useNavigate();
  const { t, isGujarati } = useLanguage();
  const {
    barbers,
    calledTickets,
    inChairTickets,
    waitingTickets,
    refreshQueue,
  } = useQueue();

  const currentSlug = String(name || 'ravi').toLowerCase().trim();
  const barber = barbers.find((b) => b.slug === currentSlug) || barbers[0];

  // Action loading states
  const [loadingAction, setLoadingAction] = useState(false);
  const [actionError, setActionError] = useState(null);

  // Live ticking timer for in-chair elapsed time
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Active ticket assigned to this chair
  const activeInChair = inChairTickets.find((t) => t.assignedBarber === barber?.slug);
  const activeCalled = calledTickets.find((t) => t.assignedBarber === barber?.slug);
  const activeTicket = activeInChair || activeCalled;

  // Next eligible ticket queued for this barber
  const nextTicket = waitingTickets.find(
    (t) => t.preferredBarber === barber?.slug || t.preferredBarber === 'any'
  );

  // Timer loop for in-chair service
  useEffect(() => {
    if (activeInChair?.startedAt) {
      const startTime = new Date(activeInChair.startedAt).getTime();
      const updateTimer = () => {
        const now = Date.now();
        const diffSecs = Math.max(0, Math.floor((now - startTime) / 1000));
        setElapsedSeconds(diffSecs);
      };

      updateTimer();
      const interval = setInterval(updateTimer, 1000);
      return () => clearInterval(interval);
    } else {
      setElapsedSeconds(0);
    }
  }, [activeInChair?.startedAt]);

  // Format seconds to HH:MM:SS
  const formatTimerClock = (totalSecs) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs
      .toString()
      .padStart(2, '0')}`;
  };

  // Action 1: Call Next Customer
  const handleCallNext = async () => {
    if (!barber?.slug) return;
    try {
      setLoadingAction(true);
      setActionError(null);
      await api.post(`/queue/barber/${barber.slug}/call-next`, {}, { headers: getStaffHeaders() });
      await refreshQueue();
    } catch (err) {
      setActionError(err.message || 'Could not call next customer');
    } finally {
      setLoadingAction(false);
    }
  };

  // Action 2: Start Service (called -> in_chair)
  const handleStartService = async () => {
    if (!barber?.slug) return;
    try {
      setLoadingAction(true);
      setActionError(null);
      await api.post(`/queue/barber/${barber.slug}/start`, {}, { headers: getStaffHeaders() });
      await refreshQueue();
    } catch (err) {
      setActionError(err.message || 'Could not start service');
    } finally {
      setLoadingAction(false);
    }
  };

  // Action 3: Done / Complete Service (in_chair -> done)
  const handleDoneService = async () => {
    if (!barber?.slug) return;
    try {
      setLoadingAction(true);
      setActionError(null);
      await api.post(`/queue/barber/${barber.slug}/done`, {}, { headers: getStaffHeaders() });
      await refreshQueue();
    } catch (err) {
      setActionError(err.message || 'Could not complete service');
    } finally {
      setLoadingAction(false);
    }
  };

  // Action 4: Toggle Break Status
  const handleStatusToggle = async (targetStatus) => {
    if (!barber?.slug || barber.status === targetStatus) return;
    try {
      setLoadingAction(true);
      setActionError(null);
      await api.patch(
        `/queue/barber/${barber.slug}/status`,
        { status: targetStatus },
        { headers: getStaffHeaders() }
      );
      await refreshQueue();
    } catch (err) {
      setActionError(err.message || 'Could not update status');
    } finally {
      setLoadingAction(false);
    }
  };

  if (!barber) {
    return (
      <div className="min-h-screen bg-obsidian-950 text-white flex items-center justify-center p-4">
        <Loader2 className="w-8 h-8 animate-spin text-brand-amber" />
      </div>
    );
  }

  const isFree = barber.status === 'available';
  const isBusy = barber.status === 'busy' || Boolean(activeTicket);
  const isOnBreak = barber.status === 'on_break';

  return (
    <div
      className={`min-h-screen flex flex-col justify-between bg-obsidian-950 text-slate-100 p-4 sm:p-6 ${
        isGujarati ? 'gujarati-text' : 'font-sans'
      }`}
    >
      {/* Container restricted to mobile-portrait terminal frame (max-w-md mx-auto) */}
      <div className="max-w-md w-full mx-auto space-y-5">
        {/* 1. TOP HEADER & BARBER SWITCHER */}
        <header className="flex items-center justify-between gap-2 border-b border-white/[0.08] pb-3">
          {/* Brand + Barber Selector Pills */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1">
            <Link
              to="/"
              className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-amber/25 to-brand-gold/10 border border-brand-amber/40 flex items-center justify-center text-brand-amber shadow-sm flex-shrink-0"
              title="Return Home"
            >
              <Scissors className="w-4 h-4 -rotate-45" />
            </Link>

            {/* Barber switcher tabs */}
            <div className="flex items-center gap-1 bg-obsidian-900 p-1 rounded-xl border border-white/5">
              {barbers.map((b) => {
                const isActive = b.slug === barber.slug;
                return (
                  <button
                    key={b.slug}
                    type="button"
                    onClick={() => navigate(`/barber/${b.slug}`)}
                    className={`min-h-[44px] px-3 py-1.5 rounded-lg text-xs font-medium flex items-center justify-center transition-all ${
                      isActive
                        ? 'bg-brand-amber text-obsidian-950 font-bold shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {b.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Status Pill + Language Toggle */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div
              className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold border flex items-center gap-1.5 ${
                isBusy
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : isOnBreak
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isBusy ? 'bg-amber-400' : isOnBreak ? 'bg-rose-400' : 'bg-emerald-400'
                }`}
              />
              <span>
                {isBusy ? t('status.busy') : isOnBreak ? t('status.onBreak') : t('barber.onDutyPill')}
              </span>
            </div>

            <LanguageToggle />
          </div>
        </header>

        {/* 2. BARBER PROFILE HEADER */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-obsidian-900/90 via-obsidian-900/80 to-obsidian-950 border border-white/[0.08] backdrop-blur-md flex items-center gap-3.5 shadow-glass-sm">
          <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-brand-amber/25 via-brand-gold/15 to-obsidian-950 border border-brand-amber/40 flex items-center justify-center font-serif text-2xl font-bold text-brand-glow shadow-inner">
            {barber.name.charAt(0)}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-serif text-white font-bold leading-tight truncate">
                {barber.name}
              </h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-slate-400 border border-white/5">
                Chair #{barbers.findIndex((b) => b.slug === barber.slug) + 1}
              </span>
            </div>
            <p className="text-xs text-slate-400 truncate mt-0.5">
              {isGujarati ? barber.specialtyGu : barber.specialtyEn}
            </p>
          </div>
        </div>

        {/* Action Error Notice */}
        <AnimatePresence>
          {actionError && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>{actionError}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 3. ACTIVE CUSTOMER CARD (CENTERPIECE) */}
        <div className="p-5 rounded-3xl bg-gradient-to-b from-obsidian-900 via-obsidian-900/95 to-obsidian-950 border border-white/[0.12] backdrop-blur-2xl shadow-glass-md space-y-4">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-2.5">
            <span className="text-[10px] font-mono uppercase tracking-widest text-brand-amber font-semibold">
              {t('barber.activeCustomer')}
            </span>

            {activeTicket && (
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                  activeInChair
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-brand-amber/20 text-brand-glow border border-brand-amber/40 animate-pulse'
                }`}
              >
                {activeInChair ? 'IN CHAIR' : 'CALLED'}
              </span>
            )}
          </div>

          {activeTicket ? (
            // WHEN BARBER HAS A CALLED OR IN-CHAIR TICKET
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                {/* Left: Token, Customer Name, Services */}
                <div className="space-y-1.5 min-w-0">
                  <span className="text-4xl font-serif text-white font-bold tracking-tight block leading-none">
                    {activeTicket.token}
                  </span>
                  <span className="font-semibold text-base text-slate-200 block truncate">
                    {activeTicket.customerName}
                  </span>

                  {/* Booked services chips */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    {activeTicket.services?.map((svc, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/5 text-slate-300"
                      >
                        {isGujarati ? svc.nameGu : svc.nameEn} · {svc.durationMin}m
                      </span>
                    ))}
                  </div>
                </div>

                {/* Right: Recessed Digital Timer Box */}
                <div className="flex-shrink-0 text-center p-3 rounded-2xl bg-obsidian-950 border border-white/10 min-w-[110px] shadow-inner">
                  {activeInChair ? (
                    <>
                      <span className="text-[9px] uppercase font-mono tracking-wider text-slate-400 block mb-0.5">
                        {t('barber.elapsed')}
                      </span>
                      <span className="text-lg font-mono font-bold text-emerald-400 block leading-tight">
                        {formatTimerClock(elapsedSeconds)}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">
                        Est: {activeTicket.totalDurationMin}m
                      </span>
                    </>
                  ) : (
                    <div className="py-2 space-y-1">
                      <Radio className="w-5 h-5 text-brand-amber animate-pulse mx-auto" />
                      <span className="text-[10px] font-mono text-brand-amber block leading-tight">
                        {t('barber.waitingForGuest')}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Full-width Main Action Trigger Button */}
              {activeCalled && (
                <button
                  type="button"
                  onClick={handleStartService}
                  disabled={loadingAction}
                  className="w-full min-h-[52px] rounded-2xl bg-gradient-to-r from-brand-amber via-brand-gold to-brand-glow text-obsidian-950 font-bold text-sm flex items-center justify-center gap-2 hover:brightness-110 shadow-amber-glow transition-all cursor-pointer"
                >
                  {loadingAction ? (
                    <Loader2 className="w-4 h-4 animate-spin text-obsidian-950" />
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-obsidian-950" />
                      <span>{t('barber.startBtn')}</span>
                    </>
                  )}
                </button>
              )}

              {activeInChair && (
                <button
                  type="button"
                  onClick={handleDoneService}
                  disabled={loadingAction}
                  className="w-full min-h-[52px] rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-obsidian-950 font-bold text-sm flex items-center justify-center gap-2 shadow-emerald-500/20 shadow-md transition-all cursor-pointer"
                >
                  {loadingAction ? (
                    <Loader2 className="w-4 h-4 animate-spin text-obsidian-950" />
                  ) : (
                    <>
                      <Check className="w-5 h-5 stroke-[3]" />
                      <span>{t('barber.doneBtn')}</span>
                    </>
                  )}
                </button>
              )}
            </div>
          ) : (
            // WHEN CHAIR IS FREE (NO ACTIVE TICKET)
            <div className="py-6 text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-center text-slate-500 mx-auto">
                <Scissors className="w-6 h-6 -rotate-45" />
              </div>

              <div className="space-y-1">
                <h2 className="text-lg font-serif text-white">
                  {t('barber.chairFree')}
                </h2>
                <p className="text-xs text-slate-400">
                  {nextTicket
                    ? `${nextTicket.customerName} (${nextTicket.token}) is ready to be served`
                    : 'No customers currently queued for this chair'}
                </p>
              </div>

              <button
                type="button"
                onClick={handleCallNext}
                disabled={!nextTicket || loadingAction || isOnBreak}
                className={`w-full min-h-[52px] rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                  nextTicket && !isOnBreak
                    ? 'bg-gradient-to-r from-brand-amber via-brand-gold to-brand-glow text-obsidian-950 shadow-amber-glow hover:brightness-110 cursor-pointer'
                    : 'bg-white/[0.04] text-slate-600 border border-white/5 cursor-not-allowed'
                }`}
              >
                {loadingAction ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>{t('barber.callNextCustomer')}</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* 4. "NEXT FOR YOU" PREVIEW CARD */}
        <div className="p-4 rounded-2xl bg-obsidian-900/70 border border-white/[0.08] backdrop-blur-md space-y-2.5">
          <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 block">
            {t('barber.nextForYou')}
          </span>

          {nextTicket ? (
            <div className="flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="font-serif font-bold text-base text-brand-glow">
                  {nextTicket.token}
                </span>
                <span className="text-slate-300 font-medium truncate">
                  {nextTicket.customerName}
                </span>
              </div>
              <span className="font-mono text-slate-400 flex-shrink-0">
                {nextTicket.totalDurationMin} min · ₹{nextTicket.totalPrice}
              </span>
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic">
              {t('barber.noNextQueued')}
            </p>
          )}
        </div>

        {/* 5. BOTTOM AVAILABILITY / BREAK TOGGLE BAR */}
        <div className="p-3.5 rounded-2xl bg-obsidian-900 border border-white/10 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">
              {t('barber.availability')}
            </span>
            <span className="text-[10px] font-mono text-slate-500">
              {isBusy ? 'Busy with guest' : isOnBreak ? 'On Break' : 'Available for calls'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {/* Available Toggle */}
            <button
              type="button"
              onClick={() => handleStatusToggle('available')}
              disabled={isBusy || loadingAction}
              className={`min-h-[44px] rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                isFree && !isBusy
                  ? 'bg-emerald-500 text-obsidian-950 shadow-sm font-bold'
                  : 'bg-white/[0.03] text-slate-400 hover:text-white border border-white/5'
              } ${isBusy ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <Check className="w-3.5 h-3.5" />
              <span>{t('status.available')}</span>
            </button>

            {/* On Break Toggle */}
            <button
              type="button"
              onClick={() => handleStatusToggle('on_break')}
              disabled={isBusy || loadingAction}
              className={`min-h-[44px] rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                isOnBreak
                  ? 'bg-amber-500 text-obsidian-950 shadow-sm font-bold'
                  : 'bg-white/[0.03] text-slate-400 hover:text-white border border-white/5'
              } ${isBusy ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <Coffee className="w-3.5 h-3.5" />
              <span>{t('status.onBreak')}</span>
            </button>
          </div>

          {isBusy && (
            <p className="text-[10px] text-slate-500 text-center pt-0.5">
              {t('barber.activeChairWarning')}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default BarberPage;

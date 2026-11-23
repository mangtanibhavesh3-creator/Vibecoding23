import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Clock,
  User,
  Info,
  BellRing,
  Scissors,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Loader2,
  Phone,
} from 'lucide-react';
import { AppShell } from '../components/layout/AppShell.jsx';
import { TactileCard } from '../components/ui/TactileCard.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import { useQueue } from '../context/QueueContext.jsx';
import { api } from '../lib/api.js';
import socket from '../lib/socket.js';
import { triggerTurnAlert } from '../lib/audio.js';
import { springSnappy, springBouncy, fadeInUp, staggerContainer } from '../lib/motion.js';

export const MyStatusPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, isGujarati } = useLanguage();
  const { barbers, refreshQueue } = useQueue();

  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Cancel Confirmation Modal State
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  // Live in-chair session timer
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Ref to track if turn alert has already been fired for this session
  const hasAlertedRef = useRef(false);

  // Fetch ticket details
  const fetchTicket = useCallback(async () => {
    if (!id) return;
    try {
      setError(null);
      const res = await api.get(`/queue/ticket/${id}`);
      const fetchedTicket = res.data;
      setTicket(fetchedTicket);

      // Manage active ticket persistence in localStorage
      if (['waiting', 'called', 'in_chair'].includes(fetchedTicket.status)) {
        localStorage.setItem(
          'salon_active_ticket',
          JSON.stringify({ ticketId: fetchedTicket._id, token: fetchedTicket.token })
        );
      } else {
        localStorage.removeItem('salon_active_ticket');
      }

      // Check if status is called and trigger alert once
      if (fetchedTicket.status === 'called' && !hasAlertedRef.current) {
        hasAlertedRef.current = true;
        triggerTurnAlert();
      }
    } catch (err) {
      console.error('[MyStatusPage] Error fetching ticket:', err);
      setError(err.message || 'Ticket not found');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchTicket();
  }, [fetchTicket]);

  // Socket.IO event subscriptions for real-time live sync
  useEffect(() => {
    const handleQueueUpdated = () => {
      fetchTicket();
    };

    const handleTicketCalled = (payload) => {
      if (
        ticket &&
        (String(payload.ticketId) === String(ticket._id) || payload.token === ticket.token)
      ) {
        fetchTicket();
        triggerTurnAlert();
      }
    };

    socket.on('queue:updated', handleQueueUpdated);
    socket.on('ticket:called', handleTicketCalled);

    return () => {
      socket.off('queue:updated', handleQueueUpdated);
      socket.off('ticket:called', handleTicketCalled);
    };
  }, [fetchTicket, ticket]);

  // Timer loop for in_chair session elapsed time
  useEffect(() => {
    if (ticket?.status === 'in_chair' && ticket?.startedAt) {
      const startTime = new Date(ticket.startedAt).getTime();
      const updateTimer = () => {
        const now = Date.now();
        const diffSecs = Math.max(0, Math.floor((now - startTime) / 1000));
        setElapsedSeconds(diffSecs);
      };

      updateTimer();
      const interval = setInterval(updateTimer, 1000);
      return () => clearInterval(interval);
    }
  }, [ticket?.status, ticket?.startedAt]);

  // Cancel Spot Handler
  const handleConfirmCancel = async () => {
    if (!ticket?._id) return;
    try {
      setIsCancelling(true);
      await api.post(`/queue/ticket/${ticket._id}/cancel`);
      localStorage.removeItem('salon_active_ticket');
      setShowCancelModal(false);
      await fetchTicket();
      await refreshQueue();
    } catch (err) {
      console.error('[Cancel Error]', err);
      alert(err.message || 'Failed to cancel ticket');
    } finally {
      setIsCancelling(false);
    }
  };

  // Helper: Format elapsed seconds into mm:ss
  const formatTimer = (secs) => {
    const mins = Math.floor(secs / 60);
    const remSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remSecs.toString().padStart(2, '0')}`;
  };

  // Helper: Format localized ordinal position
  const getOrdinalPositionText = (pos) => {
    if (!pos) return '—';
    if (pos === 1) return t('statusTracker.firstInLine');
    if (pos === 2) return t('statusTracker.secondInLine');
    if (pos === 3) return t('statusTracker.thirdInLine');
    return t('statusTracker.ordinalNth', '{n}th in Line').replace('{n}', pos);
  };

  // Resolve assigned or preferred barber display name
  const getBarberName = () => {
    if (ticket?.assignedBarberInfo?.name) return ticket.assignedBarberInfo.name;
    if (ticket?.assignedBarber) {
      const b = barbers.find((item) => item.slug === ticket.assignedBarber);
      if (b) return b.name;
    }
    if (ticket?.preferredBarberInfo?.name) return ticket.preferredBarberInfo.name;
    if (ticket?.preferredBarber && ticket.preferredBarber !== 'any') {
      const b = barbers.find((item) => item.slug === ticket.preferredBarber);
      if (b) return b.name;
    }
    return t('queue.anyBarber');
  };

  // SKELETON LOADING STATE
  if (loading) {
    return (
      <AppShell>
        <div className="max-w-2xl mx-auto space-y-6 pt-4">
          <div className="h-8 w-32 bg-white/5 rounded-lg animate-pulse" />
          <div className="grid grid-cols-2 gap-4">
            <div className="h-44 bg-obsidian-900/80 rounded-3xl border border-white/5 animate-pulse" />
            <div className="h-44 bg-obsidian-900/80 rounded-3xl border border-white/5 animate-pulse" />
          </div>
          <div className="h-14 bg-obsidian-900/80 rounded-full border border-white/5 animate-pulse" />
          <div className="h-48 bg-obsidian-900/80 rounded-3xl border border-white/5 animate-pulse" />
        </div>
      </AppShell>
    );
  }

  // TICKET NOT FOUND / ERROR STATE
  if (error || !ticket) {
    return (
      <AppShell>
        <div className="max-w-md mx-auto text-center space-y-6 pt-12">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-serif text-white">
              {t('statusTracker.ticketNotFound')}
            </h1>
            <p className="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto">
              {t('statusTracker.ticketNotFoundDesc')}
            </p>
          </div>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-obsidian-900 border border-white/10 text-brand-glow text-xs font-semibold hover:border-brand-amber min-h-[44px]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t('statusTracker.backToHome')}</span>
          </Link>
        </div>
      </AppShell>
    );
  }

  const isWaiting = ticket.status === 'waiting';
  const isCalled = ticket.status === 'called';
  const isInChair = ticket.status === 'in_chair';
  const isTerminal = ['done', 'cancelled', 'no_show'].includes(ticket.status);

  // Circular ring progress percentage calculation
  const maxWaitRef = 45; // benchmark scale 45 mins
  const progressPercent = Math.min(100, Math.max(8, ((ticket.estimatedWaitMin || 0) / maxWaitRef) * 100));
  const strokeDashoffset = 339.29 - (339.29 * (isCalled || isInChair ? 0 : progressPercent)) / 100;

  return (
    <AppShell>
      {/* Background Emerald Wave Luminescence */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-[650px] h-[350px] bg-emerald-500/[0.04] rounded-full blur-3xl pointer-events-none -z-10" />

      <motion.div
        variants={staggerContainer(0.08, 0.04)}
        initial="hidden"
        animate="show"
        className="max-w-xl mx-auto space-y-5 pb-20"
      >
        {/* Navigation Back Link */}
        <motion.div variants={fadeInUp} className="flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-white transition-colors min-h-[44px] -ml-2 px-2 rounded-lg"
          >
            <ArrowLeft className="w-4 h-4 text-brand-amber" />
            <span>{t('nav.back')}</span>
          </Link>

          <span className="text-[11px] font-mono tracking-wider text-slate-500 uppercase">
            {ticket.customerName}
          </span>
        </motion.div>

        {/* 1. TOP SPLIT HERO ROW (2-COLUMN GRID) */}
        <motion.div variants={fadeInUp} className="grid grid-cols-2 gap-4">
          {/* LEFT: Frosted Token Card + Rank Readout */}
          <div className="p-5 rounded-3xl bg-gradient-to-b from-obsidian-900/90 to-obsidian-950/90 border border-white/[0.12] backdrop-blur-xl shadow-glass-md flex flex-col justify-between">
            <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 block">
              {t('queue.tokenNumber')}
            </span>

            {/* Large Tabular Token Numerals */}
            <div className="my-2">
              <span className="text-4xl sm:text-5xl font-serif text-white tracking-tight font-bold block leading-none">
                {ticket.token}
              </span>
            </div>

            {/* Position Readout beneath Token */}
            <div className="pt-2 border-t border-white/[0.06]">
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">
                {t('statusTracker.yourPosition')}
              </span>
              <span className="text-xs sm:text-sm font-semibold text-brand-glow mt-0.5 block truncate">
                {isWaiting ? getOrdinalPositionText(ticket.position) : t(`status.${ticket.status}`)}
              </span>
            </div>
          </div>

          {/* RIGHT: Circular Countdown Progress Ring */}
          <div className="p-5 rounded-3xl bg-gradient-to-b from-obsidian-900/90 to-obsidian-950/90 border border-white/[0.12] backdrop-blur-xl shadow-glass-md flex flex-col items-center justify-center relative overflow-hidden">
            <div className="relative w-28 h-28 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 120 120">
                <circle
                  cx="60"
                  cy="60"
                  r="54"
                  className="stroke-white/[0.08]"
                  strokeWidth="7"
                  fill="transparent"
                />
                <circle
                  cx="60"
                  cy="60"
                  r="54"
                  stroke="url(#progressGrad)"
                  strokeWidth="7"
                  strokeDasharray="339.29"
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  fill="transparent"
                  className="transition-all duration-700 ease-out"
                />
                <defs>
                  <linearGradient id="progressGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#34d399" />
                    <stop offset="100%" stopColor="#e59b58" />
                  </linearGradient>
                </defs>
              </svg>

              {/* Inside Circle Content */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-1">
                <Clock className="w-3.5 h-3.5 text-brand-amber mb-0.5" />
                <span className="text-base sm:text-lg font-serif font-bold text-white leading-tight">
                  {isWaiting
                    ? `~${ticket.estimatedWaitMin ?? 0}m`
                    : isCalled || isInChair
                    ? t('statusTracker.now')
                    : '—'}
                </span>
                <span className="text-[9px] uppercase font-mono tracking-wider text-slate-400 mt-0.5">
                  {t('statusTracker.estimatedWait')}
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* 2. MIDDLE ALERT PILL BANNER */}
        <motion.div variants={fadeInUp}>
          {isWaiting && ticket.position <= 2 ? (
            // Approaching Alert Banner
            <div className="px-4 py-3 rounded-full bg-gradient-to-r from-brand-amber/20 via-brand-gold/15 to-obsidian-900 border border-brand-amber/50 shadow-amber-glow flex items-center gap-3">
              <div className="w-7 h-7 rounded-full bg-brand-amber/30 flex items-center justify-center text-brand-amber flex-shrink-0">
                <Info className="w-4 h-4" />
              </div>
              <span className="text-xs sm:text-sm font-semibold text-brand-glow">
                {t('statusTracker.startComingAlert')}
              </span>
            </div>
          ) : isWaiting ? (
            // Calm Position Banner
            <div className="px-4 py-3 rounded-full bg-obsidian-900/80 border border-white/[0.08] backdrop-blur-md flex items-center gap-3 text-xs text-slate-300">
              <div className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center text-slate-400 flex-shrink-0">
                <Info className="w-4 h-4" />
              </div>
              <span className="truncate">
                {t('statusTracker.calmWaitingNotice', 'Waiting in queue · Preferred: {barber}').replace(
                  '{barber}',
                  getBarberName()
                )}
              </span>
            </div>
          ) : isCalled ? (
            // Turn Alert Banner
            <div className="px-4 py-3 rounded-full bg-emerald-500/20 border border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.3)] flex items-center gap-3">
              <div className="w-7 h-7 rounded-full bg-emerald-500/40 flex items-center justify-center text-emerald-200 flex-shrink-0">
                <BellRing className="w-4 h-4 animate-bounce" />
              </div>
              <span className="text-xs sm:text-sm font-bold text-emerald-200">
                {t('statusTracker.yourTurnTitle')} {t('statusTracker.goToBarber', 'Go to {barber}').replace('{barber}', getBarberName())}
              </span>
            </div>
          ) : null}
        </motion.div>

        {/* 3. CENTERPIECE FEATURE CARD (DYNAMIC TRANSFORMATION) */}
        <motion.div variants={fadeInUp}>
          {isCalled ? (
            // STATE: CALLED ("It's your turn!")
            <motion.div
              layout
              transition={springBouncy}
              className="p-8 sm:p-10 rounded-3xl bg-gradient-to-b from-brand-amber/25 via-obsidian-900 to-obsidian-950 border-2 border-brand-amber shadow-amber-glow-lg text-center space-y-5 relative overflow-hidden"
            >
              {/* Radial Accent Burst Lines */}
              <div className="w-24 h-24 mx-auto rounded-full bg-brand-amber/20 border border-brand-amber/40 flex items-center justify-center relative">
                <div className="absolute inset-0 rounded-full animate-ping bg-brand-amber/20" />
                <BellRing className="w-12 h-12 text-brand-glow animate-bounce" />
              </div>

              <div className="space-y-2">
                <h2 className="text-3xl sm:text-4xl font-serif font-bold text-white tracking-tight">
                  {t('statusTracker.yourTurnTitle')}
                </h2>
                <p className="text-base sm:text-lg font-medium text-brand-amber">
                  {t('statusTracker.goToBarber', 'Go to {barber}').replace('{barber}', getBarberName())}
                </p>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  Your stylist is ready for your session at chair station.
                </p>
              </div>
            </motion.div>
          ) : isInChair ? (
            // STATE: IN CHAIR (Live session timer)
            <div className="p-8 rounded-3xl bg-obsidian-900/90 border border-emerald-500/40 shadow-[0_0_24px_rgba(16,185,129,0.2)] text-center space-y-4">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                <Scissors className="w-7 h-7 -rotate-45 animate-pulse" />
              </div>

              <div className="space-y-1">
                <h2 className="text-2xl font-serif text-white">
                  {t('statusTracker.inChairWith', 'In Chair with {barber}').replace('{barber}', getBarberName())}
                </h2>
                <span className="text-[11px] font-mono uppercase tracking-widest text-slate-400 block">
                  {t('statusTracker.sessionElapsed')}
                </span>
                <span className="text-3xl sm:text-4xl font-mono text-emerald-400 font-bold block">
                  {formatTimer(elapsedSeconds)}
                </span>
              </div>
            </div>
          ) : isTerminal ? (
            // STATE: TERMINAL (Done, Cancelled, No-Show)
            <div className="p-8 rounded-3xl bg-obsidian-900/80 border border-white/10 text-center space-y-5">
              <div className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center">
                {ticket.status === 'done' ? (
                  <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                ) : ticket.status === 'cancelled' ? (
                  <div className="w-14 h-14 rounded-2xl bg-slate-500/20 border border-slate-500/40 flex items-center justify-center text-slate-400">
                    <XCircle className="w-7 h-7" />
                  </div>
                ) : (
                  <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                    <AlertTriangle className="w-7 h-7" />
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <h2 className="text-2xl font-serif text-white">
                  {ticket.status === 'done'
                    ? t('statusTracker.ticketCompleted')
                    : ticket.status === 'cancelled'
                    ? t('statusTracker.ticketCancelled')
                    : t('statusTracker.ticketNoShow')}
                </h2>
                <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                  {ticket.status === 'done'
                    ? t('statusTracker.ticketCompletedDesc')
                    : ticket.status === 'cancelled'
                    ? t('statusTracker.ticketCancelledDesc')
                    : t('statusTracker.ticketNoShowDesc')}
                </p>
              </div>

              <div className="pt-2">
                <Link
                  to="/join"
                  className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-gradient-to-r from-brand-amber to-brand-glow text-obsidian-950 font-bold text-xs hover:brightness-110 min-h-[44px]"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>{t('statusTracker.bookAgain')}</span>
                </Link>
              </div>
            </div>
          ) : (
            // STATE: WAITING (Clean summary card showing booked services)
            <div className="p-6 rounded-3xl bg-obsidian-900/80 border border-white/[0.1] backdrop-blur-xl space-y-4">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                <span className="text-xs font-mono uppercase tracking-wider text-brand-amber">
                  {t('statusTracker.bookedServices')}
                </span>
                <span className="text-xs font-mono text-slate-400">
                  {ticket.services?.length || 0} selected
                </span>
              </div>

              <div className="space-y-2">
                {ticket.services?.map((svc, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between text-xs py-1"
                  >
                    <span className="text-slate-300">
                      {isGujarati ? svc.nameGu : svc.nameEn}
                    </span>
                    <span className="font-mono text-slate-400">
                      {svc.durationMin}m · ₹{svc.price}
                    </span>
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs font-medium">
                <span className="text-slate-400">{t('statusTracker.totalPrice')}</span>
                <span className="text-base font-serif text-white">
                  ₹{ticket.totalPrice} ({ticket.totalDurationMin} min)
                </span>
              </div>
            </div>
          )}
        </motion.div>

        {/* 4. BOTTOM ACTION: CANCEL SPOT BUTTON */}
        {isWaiting && (
          <motion.div variants={fadeInUp} className="text-center pt-2">
            <button
              type="button"
              onClick={() => setShowCancelModal(true)}
              className="text-xs text-rose-400/80 hover:text-rose-300 px-6 py-2.5 rounded-full border border-rose-500/20 hover:border-rose-500/40 bg-rose-500/5 transition-all min-h-[48px]"
            >
              {t('statusTracker.cancelMySpot')}
            </button>
          </motion.div>
        )}
      </motion.div>

      {/* 5. SLEEK GLASSMORPHIC CONFIRMATION MODAL */}
      <AnimatePresence>
        {showCancelModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-obsidian-950/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={springSnappy}
              className="max-w-sm w-full p-6 rounded-3xl bg-obsidian-900 border border-white/10 shadow-glass-lg space-y-4 text-center"
            >
              <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>

              <div className="space-y-1.5">
                <h3 className="text-lg font-serif text-white">
                  {t('statusTracker.cancelModalTitle')}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {t('statusTracker.cancelModalDesc', '').replace('{token}', ticket?.token || '')}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCancelModal(false)}
                  disabled={isCancelling}
                  className="px-4 py-2.5 rounded-full bg-white/5 border border-white/10 text-xs text-slate-300 font-medium hover:bg-white/10 transition-colors min-h-[44px]"
                >
                  {t('statusTracker.keepMySpot')}
                </button>

                <button
                  type="button"
                  onClick={handleConfirmCancel}
                  disabled={isCancelling}
                  className="px-4 py-2.5 rounded-full bg-rose-500/20 border border-rose-500/40 text-xs text-rose-300 font-semibold hover:bg-rose-500/30 transition-colors min-h-[44px] flex items-center justify-center gap-1.5"
                >
                  {isCancelling ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <span>{t('statusTracker.confirmCancel')}</span>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AppShell>
  );
};

export default MyStatusPage;

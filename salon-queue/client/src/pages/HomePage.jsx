import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Clock,
  Users,
  ArrowRight,
  Sparkles,
  AlertCircle,
  Scissors,
  CheckCircle2,
  Coffee,
  CircleDot,
  Radio,
} from 'lucide-react';
import { AppShell } from '../components/layout/AppShell.jsx';
import { SplitHeading } from '../components/ui/SplitHeading.jsx';
import { TactileCard } from '../components/ui/TactileCard.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import { useQueue } from '../context/QueueContext.jsx';
import { springSnappy, fadeInUp, staggerContainer } from '../lib/motion.js';

export const HomePage = () => {
  const { t, isGujarati } = useLanguage();
  const { barbers, todayStats, waitingTickets, onlineStatus, salonConfig } = useQueue();
  const navigate = useNavigate();

  // Compute live estimated wait time across all waiting patrons
  const workingBarbersCount = barbers.filter((b) => b.onDuty && b.status !== 'on_break').length;
  const totalWaitingMinutes = waitingTickets.reduce((sum, t) => sum + (t.totalDurationMin || 0), 0);
  const estimatedWaitMin =
    waitingTickets.length > 0
      ? Math.ceil(totalWaitingMinutes / Math.max(1, workingBarbersCount))
      : 0;

  const isOnlineOpen = onlineStatus?.isOpen !== false;

  const [activeTicket, setActiveTicket] = useState(() => {
    try {
      const saved = localStorage.getItem('salon_active_ticket');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  return (
    <AppShell>
      <motion.div
        variants={staggerContainer(0.08, 0.05)}
        initial="hidden"
        animate="show"
        className="max-w-4xl mx-auto space-y-8 sm:space-y-12"
      >
        {/* Active Ticket Jump Banner */}
        {activeTicket?.ticketId && (
          <motion.div variants={fadeInUp} className="flex justify-center -mb-2">
            <Link
              to={`/status/${activeTicket.ticketId}`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-brand-amber/20 via-brand-gold/15 to-obsidian-900 border border-brand-amber/40 text-brand-glow text-xs font-semibold hover:border-brand-amber hover:scale-102 shadow-amber-glow transition-all min-h-[44px]"
            >
              <Radio className="w-3.5 h-3.5 text-brand-amber animate-pulse" />
              <span>
                {t('home.viewActiveTicket', 'View Active Ticket ({token}) →').replace(
                  '{token}',
                  activeTicket.token || 'Active'
                )}
              </span>
            </Link>
          </motion.div>
        )}

        {/* Salon Status Alert Banner */}
        <motion.div variants={fadeInUp} className="flex justify-center">
          {isOnlineOpen ? (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-xs font-medium shadow-sm backdrop-blur-md">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span>{t('brand.hours')}</span>
              <span className="text-emerald-500/60">·</span>
              <span className="text-slate-300">
                {salonConfig?.openTime || '09:00'} - {salonConfig?.closeTime || '21:00'} IST
              </span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs font-medium shadow-sm backdrop-blur-md">
              <AlertCircle className="w-4 h-4 text-amber-400" />
              <span>{t('home.closedWarning')}</span>
              <span className="text-amber-500/60">·</span>
              <span className="text-slate-300">
                Closes {onlineStatus?.closeTimeFormatted || '9:00 PM'}
              </span>
            </div>
          )}
        </motion.div>

        {/* Hero Section */}
        <motion.div variants={fadeInUp} className="text-center space-y-4 pt-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-amber/10 border border-brand-amber/20 text-brand-amber text-xs font-medium">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{t('home.heroTag')}</span>
          </div>

          <div>
            <SplitHeading
              text={t('brand.tagline')}
              as="h1"
              className="text-4xl sm:text-6xl font-serif text-white tracking-tight justify-center leading-tight"
            />
          </div>

          <p className="text-slate-400 text-base sm:text-lg max-w-xl mx-auto font-light leading-relaxed">
            {t('brand.subtitle')}
          </p>
        </motion.div>

        {/* Hero Pulse Card: Real-time Stats */}
        <motion.div variants={fadeInUp}>
          <TactileCard
            glow
            className="p-6 sm:p-8 bg-gradient-to-b from-obsidian-900/90 via-obsidian-900/80 to-obsidian-950/90 border-white/[0.12] shadow-glass-lg relative overflow-hidden"
          >
            <div className="grid grid-cols-2 gap-6 sm:gap-8 divide-x divide-white/[0.08]">
              {/* Stat 1: People Waiting */}
              <div className="flex flex-col items-center justify-center text-center px-2">
                <span className="text-[11px] sm:text-xs font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-2">
                  <Users className="w-3.5 h-3.5 text-brand-amber" />
                  {t('home.peopleWaiting')}
                </span>
                <span className="text-5xl sm:text-6xl font-serif text-white tracking-tight leading-none">
                  {todayStats?.waitingCount ?? waitingTickets.length ?? 0}
                </span>
                <span className="text-[11px] text-slate-500 mt-2">
                  {todayStats?.waitingCount === 1 ? 'customer in line' : 'customers in line'}
                </span>
              </div>

              {/* Stat 2: Est. Wait Time */}
              <div className="flex flex-col items-center justify-center text-center px-2">
                <span className="text-[11px] sm:text-xs font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-2">
                  <Clock className="w-3.5 h-3.5 text-brand-amber" />
                  {t('home.estWaitTime')}
                </span>
                <span className="text-5xl sm:text-6xl font-serif text-brand-glow tracking-tight leading-none">
                  ~{estimatedWaitMin}
                  <span className="text-2xl sm:text-3xl text-brand-amber/80 ml-1 font-sans">m</span>
                </span>
                <span className="text-[11px] text-slate-500 mt-2">
                  {workingBarbersCount} {workingBarbersCount === 1 ? 'barber active' : 'barbers active'}
                </span>
              </div>
            </div>

            {/* Offline notice if closed */}
            {!isOnlineOpen && (
              <div className="mt-6 pt-5 border-t border-white/5 flex items-start gap-3 bg-white/[0.02] p-3.5 rounded-xl text-xs text-slate-400">
                <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="leading-relaxed">{t('home.closedNotice')}</p>
              </div>
            )}
          </TactileCard>
        </motion.div>

        {/* Dynamic Barber Chips */}
        <motion.div variants={fadeInUp} className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-mono tracking-wider uppercase text-slate-400 flex items-center gap-2">
              <Scissors className="w-4 h-4 text-brand-amber" />
              <span>{t('home.ourBarbers')}</span>
            </h2>
            <span className="text-[11px] text-slate-500 font-mono">
              {barbers.length} Stylists On Roster
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {barbers.map((barber) => {
              const isFree = barber.status === 'available';
              const isBusy = barber.status === 'busy';
              const isOnBreak = barber.status === 'on_break';

              const statusColor = isFree
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                : isBusy
                ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                : 'bg-rose-500/15 text-rose-300 border-rose-500/30';

              const statusLabel = isFree
                ? t('status.free')
                : isBusy
                ? t('status.busy')
                : t('status.onBreak');

              return (
                <div
                  key={barber._id || barber.slug}
                  className="p-4 rounded-2xl bg-obsidian-900/70 border border-white/[0.08] backdrop-blur-md flex items-center gap-3.5 hover:border-brand-amber/30 transition-all group"
                >
                  {/* Stylist Avatar with initials */}
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-amber/20 via-brand-gold/10 to-obsidian-950 border border-brand-amber/30 flex items-center justify-center font-serif text-lg text-brand-glow group-hover:scale-105 transition-transform flex-shrink-0 shadow-inner">
                    {barber.name.charAt(0)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-medium text-sm text-white truncate block">
                        {barber.name}
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full border font-medium whitespace-nowrap ${statusColor}`}
                      >
                        {barber.name} · {statusLabel}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">
                      {isGujarati ? barber.specialtyGu : barber.specialtyEn}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Primary Call to Action Button */}
        <motion.div variants={fadeInUp} className="pt-2 text-center">
          {isOnlineOpen ? (
            <motion.button
              type="button"
              onClick={() => navigate('/join')}
              whileHover={{ scale: 1.025, transition: springSnappy }}
              whileTap={{ scale: 0.975, transition: springSnappy }}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-10 py-4 rounded-full bg-gradient-to-r from-brand-amber via-brand-gold to-brand-glow text-obsidian-950 font-bold text-base hover:brightness-110 shadow-amber-glow-lg transition-all min-h-[48px] cursor-pointer"
            >
              <span>{t('home.joinCta')}</span>
              <ArrowRight className="w-5 h-5 text-obsidian-950" />
            </motion.button>
          ) : (
            <div className="space-y-3">
              <button
                type="button"
                disabled
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-10 py-4 rounded-full bg-obsidian-850 border border-white/10 text-slate-500 font-semibold text-sm cursor-not-allowed min-h-[48px]"
              >
                <span>{t('home.closedWarning')}</span>
              </button>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                {t('home.closedNotice')}
              </p>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AppShell>
  );
};

export default HomePage;

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  User,
  Phone,
  CheckCircle2,
  Circle,
  Clock,
  Sparkles,
  Zap,
  AlertCircle,
  Loader2,
  Trash2,
} from 'lucide-react';
import { AppShell } from '../components/layout/AppShell.jsx';
import { TactileCard } from '../components/ui/TactileCard.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import { useQueue } from '../context/QueueContext.jsx';
import { springSnappy, fadeInUp, staggerContainer } from '../lib/motion.js';

export const JoinQueuePage = () => {
  const { t, isGujarati } = useLanguage();
  const { services, barbers, waitingTickets, joinOnline, onlineStatus } = useQueue();
  const navigate = useNavigate();

  // Form State
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedServiceIds, setSelectedServiceIds] = useState([]);
  const [preferredBarber, setPreferredBarber] = useState('any');

  // UI / Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  // Phone input handler enforcing strict numeric 10-digits
  const handlePhoneChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 10);
    setPhone(raw);
    if (formError) setFormError(null);
  };

  const handleNameChange = (e) => {
    setCustomerName(e.target.value);
    if (formError) setFormError(null);
  };

  // Service Selection toggler (Max 3)
  const toggleService = (id) => {
    if (selectedServiceIds.includes(id)) {
      setSelectedServiceIds(selectedServiceIds.filter((sId) => sId !== id));
      if (formError) setFormError(null);
    } else {
      if (selectedServiceIds.length >= 3) {
        setFormError(t('errors.serviceMax'));
        return;
      }
      setSelectedServiceIds([...selectedServiceIds, id]);
      if (formError) setFormError(null);
    }
  };

  const clearAllServices = () => {
    setSelectedServiceIds([]);
    if (formError) setFormError(null);
  };

  // Calculations
  const selectedServices = services.filter((s) => selectedServiceIds.includes(s._id));
  const totalDurationMin = selectedServices.reduce((sum, s) => sum + s.durationMin, 0);
  const totalPrice = selectedServices.reduce((sum, s) => sum + s.price, 0);

  // Dynamic wait time estimate
  const workingBarbers = barbers.filter((b) => b.onDuty && b.status !== 'on_break').length;
  let estimatedWaitMin = 0;
  if (preferredBarber === 'any') {
    const minutesAhead = waitingTickets.reduce((sum, t) => sum + (t.totalDurationMin || 0), 0);
    estimatedWaitMin = Math.ceil(minutesAhead / Math.max(1, workingBarbers));
  } else {
    const competing = waitingTickets.filter(
      (t) => t.preferredBarber === preferredBarber || t.preferredBarber === 'any'
    );
    const minutesAhead = competing.reduce((sum, t) => sum + (t.totalDurationMin || 0), 0);
    estimatedWaitMin = Math.ceil(minutesAhead / 1);
  }

  // Validation
  const isNameValid = customerName.trim().length >= 2;
  const isPhoneValid = /^\d{10}$/.test(phone);
  const isServicesValid = selectedServiceIds.length >= 1 && selectedServiceIds.length <= 3;
  const isFormValid = isNameValid && isPhoneValid && isServicesValid;

  // Form Submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);

    if (!isNameValid) {
      setFormError(t('errors.nameRequired'));
      return;
    }
    if (!isPhoneValid) {
      setFormError(t('errors.phoneRequired'));
      return;
    }
    if (!isServicesValid) {
      setFormError(t('errors.serviceRequired'));
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await joinOnline({
        customerName: customerName.trim(),
        phone,
        serviceIds: selectedServiceIds,
        preferredBarber,
      });

      // Persist active ticket in localStorage
      if (res?.ticket?._id) {
        localStorage.setItem(
          'salon_active_ticket',
          JSON.stringify({ ticketId: res.ticket._id, token: res.ticket.token })
        );
        navigate(`/status/${res.ticket._id}`);
      } else {
        throw new Error('Missing ticket confirmation from server');
      }
    } catch (err) {
      console.error('[Join Error]', err);
      const msg = err.response?.data?.message || err.message || 'Failed to join queue. Please retry.';
      setFormError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppShell hideNav={false}>
      <div className="max-w-3xl mx-auto pb-32 space-y-8">
        {/* Navigation Header */}
        <div className="space-y-3">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-white transition-colors min-h-[44px] min-w-[44px] -ml-2 px-2 rounded-lg"
          >
            <ArrowLeft className="w-4 h-4 text-brand-amber" />
            <span>{t('nav.back')}</span>
          </Link>

          <div>
            <h1 className="text-3xl sm:text-4xl font-serif text-white tracking-tight leading-tight">
              {t('join.title')}
            </h1>
            <p className="text-sm text-slate-400 font-light mt-1">
              {t('join.subtitle')}
            </p>
          </div>
        </div>

        {/* Global Error Notice if online joining closed */}
        {onlineStatus?.isOpen === false && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-3 shadow-glass-sm">
            <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <p>{t('home.closedNotice')}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* SECTION 1: Customer Details */}
          <TactileCard className="p-6 space-y-5">
            <h2 className="text-xs font-mono uppercase tracking-wider text-brand-amber flex items-center gap-2">
              <User className="w-4 h-4" />
              <span>Step 1 · Customer Information</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Name Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-300">
                  {t('join.nameLabel')} <span className="text-brand-amber">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={customerName}
                    onChange={handleNameChange}
                    placeholder={t('join.namePlaceholder')}
                    className="w-full px-4 py-3 rounded-xl bg-obsidian-950/80 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-brand-amber focus:ring-1 focus:ring-brand-amber transition-all min-h-[44px]"
                  />
                  {isNameValid && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                  )}
                </div>
              </div>

              {/* Phone Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-300">
                  {t('join.phoneLabel')} <span className="text-brand-amber">*</span>
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    inputMode="numeric"
                    value={phone}
                    onChange={handlePhoneChange}
                    placeholder={t('join.phonePlaceholder')}
                    className="w-full px-4 py-3 rounded-xl bg-obsidian-950/80 border border-white/10 text-white placeholder-slate-500 text-sm font-mono tracking-wider focus:outline-none focus:border-brand-amber focus:ring-1 focus:ring-brand-amber transition-all min-h-[44px]"
                  />
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                    {isPhoneValid ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <span className="text-[10px] font-mono text-slate-500">
                        {phone.length}/10
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </TactileCard>

          {/* SECTION 2: Service Selection (Max 3) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base sm:text-lg font-serif text-white">
                  {t('join.servicesTitle')}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {t('join.servicesSubtitle')} ({selectedServiceIds.length}/3)
                </p>
              </div>

              {selectedServiceIds.length > 0 && (
                <button
                  type="button"
                  onClick={clearAllServices}
                  className="text-xs text-slate-400 hover:text-brand-amber flex items-center gap-1 min-h-[44px] px-2"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{t('join.clearAll')}</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {services.map((service) => {
                const isSelected = selectedServiceIds.includes(service._id);

                return (
                  <motion.div
                    key={service._id}
                    onClick={() => toggleService(service._id)}
                    whileHover={{ scale: 1.01, transition: springSnappy }}
                    whileTap={{ scale: 0.985, transition: springSnappy }}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 min-h-[72px] select-none ${
                      isSelected
                        ? 'bg-gradient-to-r from-brand-amber/15 to-brand-gold/10 border-brand-amber/60 shadow-amber-glow'
                        : 'bg-obsidian-900/70 border-white/[0.08] hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex-shrink-0 text-brand-amber">
                        {isSelected ? (
                          <CheckCircle2 className="w-5 h-5 fill-brand-amber text-obsidian-950" />
                        ) : (
                          <Circle className="w-5 h-5 text-slate-500" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm text-white">
                            {service.nameEn}
                          </span>
                          <span className="text-xs text-slate-400 font-gujarati">
                            · {service.nameGu}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                          <span className="flex items-center gap-1 font-mono text-[11px]">
                            <Clock className="w-3 h-3 text-brand-amber/80" />
                            {service.durationMin} {t('queue.minutesSuffix')}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <span className="text-base font-serif font-medium text-white block">
                        ₹{service.price}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* SECTION 3: Stylist Selection */}
          <div className="space-y-3">
            <div>
              <h2 className="text-base sm:text-lg font-serif text-white">
                {t('join.barberTitle')}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {t('join.barberSubtitle')}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Option: Any Barber (Fastest) */}
              <motion.div
                onClick={() => setPreferredBarber('any')}
                whileHover={{ scale: 1.015, transition: springSnappy }}
                whileTap={{ scale: 0.985, transition: springSnappy }}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex sm:flex-col justify-between gap-3 min-h-[90px] select-none ${
                  preferredBarber === 'any'
                    ? 'bg-gradient-to-r sm:bg-gradient-to-b from-brand-amber/20 to-brand-gold/10 border-brand-amber shadow-amber-glow'
                    : 'bg-obsidian-900/70 border-white/[0.08] hover:border-white/20'
                }`}
              >
                <div className="flex items-center sm:flex-col sm:items-start gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-brand-amber/20 border border-brand-amber/40 flex items-center justify-center text-brand-amber">
                    <Zap className="w-4 h-4 fill-brand-amber" />
                  </div>
                  <div>
                    <span className="font-semibold text-sm text-white block leading-tight">
                      {t('join.anyBarber')}
                    </span>
                    <span className="text-[11px] text-slate-400 block mt-0.5">
                      {t('join.anyBarberSub')}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-end sm:justify-start">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-medium">
                    Fastest Track
                  </span>
                </div>
              </motion.div>

              {/* Individual Barbers */}
              {barbers.map((barber) => {
                const isSelected = preferredBarber === barber.slug;
                const isFree = barber.status === 'available';

                return (
                  <motion.div
                    key={barber.slug}
                    onClick={() => setPreferredBarber(barber.slug)}
                    whileHover={{ scale: 1.015, transition: springSnappy }}
                    whileTap={{ scale: 0.985, transition: springSnappy }}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex sm:flex-col justify-between gap-3 min-h-[90px] select-none ${
                      isSelected
                        ? 'bg-gradient-to-r sm:bg-gradient-to-b from-brand-amber/20 to-brand-gold/10 border-brand-amber shadow-amber-glow'
                        : 'bg-obsidian-900/70 border-white/[0.08] hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center sm:flex-col sm:items-start gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-obsidian-850 border border-white/10 flex items-center justify-center font-serif text-sm text-brand-glow">
                        {barber.name.charAt(0)}
                      </div>
                      <div>
                        <span className="font-semibold text-sm text-white block leading-tight">
                          {barber.name}
                        </span>
                        <span className="text-[11px] text-slate-400 block mt-0.5 truncate max-w-[140px]">
                          {isGujarati ? barber.specialtyGu : barber.specialtyEn}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-end sm:justify-start">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${
                          isFree
                            ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                            : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                        }`}
                      >
                        {isFree ? t('status.free') : t('status.busy')}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Form Error Message */}
          <AnimatePresence>
            {formError && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-3"
              >
                <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                <span>{formError}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* STICKY GLASS BOTTOM SHEET (DRAWER) */}
          <div className="fixed bottom-0 left-0 right-0 z-40 backdrop-blur-2xl bg-obsidian-950/92 border-t border-white/10 p-4 sm:p-5 shadow-glass-lg">
            <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
              {/* Cumulative Metrics */}
              <div className="w-full sm:w-auto flex items-center justify-between sm:justify-start gap-4 sm:gap-8">
                <div>
                  <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block">
                    {t('join.totalLabel')}
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl sm:text-2xl font-serif text-white font-medium">
                      ₹{totalPrice}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      · {totalDurationMin}m
                    </span>
                  </div>
                </div>

                <div className="h-8 w-px bg-white/10 hidden sm:block" />

                <div>
                  <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block">
                    {t('join.expectedWaitLabel')}
                  </span>
                  <div className="flex items-baseline gap-1 text-brand-glow">
                    <span className="text-xl sm:text-2xl font-serif font-medium">
                      ~{estimatedWaitMin}
                    </span>
                    <span className="text-xs text-slate-400 font-sans">
                      {t('queue.minutesSuffix')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Confirm / Submit Button */}
              <motion.button
                type="submit"
                disabled={!isFormValid || isSubmitting}
                whileHover={isFormValid && !isSubmitting ? { scale: 1.02, transition: springSnappy } : {}}
                whileTap={isFormValid && !isSubmitting ? { scale: 0.98, transition: springSnappy } : {}}
                className={`w-full sm:w-auto min-h-[48px] px-8 py-3.5 rounded-full font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-md ${
                  isFormValid && !isSubmitting
                    ? 'bg-gradient-to-r from-brand-amber via-brand-gold to-brand-glow text-obsidian-950 shadow-amber-glow cursor-pointer hover:brightness-110'
                    : 'bg-obsidian-800 text-slate-500 border border-white/5 cursor-not-allowed'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-obsidian-950" />
                    <span>{t('join.submitting')}</span>
                  </>
                ) : (
                  <>
                    <span>{t('join.confirmCta')}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </motion.button>
            </div>
          </div>
        </form>
      </div>
    </AppShell>
  );
};

export default JoinQueuePage;

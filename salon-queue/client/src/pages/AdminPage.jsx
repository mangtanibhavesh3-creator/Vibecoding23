import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldAlert,
  Users,
  Clock,
  UserX,
  UserCheck,
  Settings,
  Scissors,
  Plus,
  Pencil,
  Trash2,
  Check,
  AlertCircle,
  ExternalLink,
  Sliders,
  CheckCircle2,
  Sparkles,
  Layers,
  X,
  Loader2,
  Tv,
  LayoutDashboard,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell.jsx';
import { StaffPinGate } from '../components/auth/StaffPinGate.jsx';
import { TactileCard } from '../components/ui/TactileCard.jsx';
import { LanguageToggle } from '../components/ui/LanguageToggle.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import { useQueue } from '../context/QueueContext.jsx';
import { api } from '../lib/api.js';
import socket from '../lib/socket.js';

export const AdminPage = () => {
  const { t, isGujarati } = useLanguage();
  const { salonConfig, todayStats, refreshQueue } = useQueue();

  // All barbers (including off-duty)
  const [allBarbers, setAllBarbers] = useState([]);
  const [loadingBarbers, setLoadingBarbers] = useState(false);

  // All services (active & inactive)
  const [allServices, setAllServices] = useState([]);
  const [loadingServices, setLoadingServices] = useState(false);

  // Operating hours form state
  const [openTime, setOpenTime] = useState(salonConfig?.openTime || '09:00');
  const [closeTime, setCloseTime] = useState(salonConfig?.closeTime || '21:00');
  const [savingHours, setSavingHours] = useState(false);
  const [hoursNotice, setHoursNotice] = useState(null);

  // Toast / notification banner state
  const [actionFeedback, setActionFeedback] = useState(null);

  // Add / Edit Service Modal state
  const [serviceModalOpen, setServiceModalOpen] = useState(false);
  const [editingService, setEditingService] = useState(null); // null if adding new
  const [serviceForm, setServiceForm] = useState({
    nameEn: '',
    nameGu: '',
    durationMin: 20,
    price: 150,
    isActive: true,
  });
  const [serviceFormError, setServiceFormError] = useState(null);
  const [savingService, setSavingService] = useState(false);

  // Delete Service Confirmation Modal state
  const [deletingService, setDeletingService] = useState(null);
  const [deletingLoading, setDeletingLoading] = useState(false);

  // Sync hours form with salonConfig updates
  useEffect(() => {
    if (salonConfig?.openTime) setOpenTime(salonConfig.openTime);
    if (salonConfig?.closeTime) setCloseTime(salonConfig.closeTime);
  }, [salonConfig]);

  // Temporary feedback toast helper
  const showFeedback = useCallback((message, type = 'success') => {
    setActionFeedback({ message, type });
    const timer = setTimeout(() => setActionFeedback(null), 4000);
    return () => clearTimeout(timer);
  }, []);

  // Fetch full list of barbers (including off-duty)
  const fetchAllBarbers = useCallback(async () => {
    try {
      setLoadingBarbers(true);
      const res = await api.get('/admin/barbers');
      if (Array.isArray(res.data)) {
        setAllBarbers(res.data);
      }
    } catch (err) {
      console.warn('[Admin] Failed to fetch barbers:', err);
    } finally {
      setLoadingBarbers(false);
    }
  }, []);

  // Fetch full list of services (including inactive)
  const fetchAllServices = useCallback(async () => {
    try {
      setLoadingServices(true);
      const res = await api.get('/admin/services');
      if (Array.isArray(res.data)) {
        setAllServices(res.data);
      }
    } catch (err) {
      console.warn('[Admin] Failed to fetch services:', err);
    } finally {
      setLoadingServices(false);
    }
  }, []);

  // Initial data loading & socket sync listener
  useEffect(() => {
    fetchAllBarbers();
    fetchAllServices();

    const handleQueueUpdated = () => {
      fetchAllBarbers();
      fetchAllServices();
    };

    socket.on('queue:updated', handleQueueUpdated);
    return () => socket.off('queue:updated', handleQueueUpdated);
  }, [fetchAllBarbers, fetchAllServices]);

  // TOGGLE QUEUE OPEN / CLOSED
  const handleToggleQueueOpen = async () => {
    try {
      const nextState = !salonConfig?.isQueueOpen;
      const res = await api.patch('/admin/config', { isQueueOpen: nextState });
      if (res.data?.config) {
        showFeedback(t('admin.configUpdatedSuccess'), 'success');
        refreshQueue();
      }
    } catch (err) {
      showFeedback(err.message || 'Failed to toggle queue', 'error');
    }
  };

  // SAVE OPERATING HOURS
  const handleSaveHours = async (e) => {
    e.preventDefault();
    try {
      setSavingHours(true);
      setHoursNotice(null);
      await api.patch('/admin/config', { openTime, closeTime });
      showFeedback(t('admin.hoursSavedSuccess'), 'success');
      setHoursNotice({ text: t('admin.hoursSavedSuccess'), type: 'success' });
      refreshQueue();
    } catch (err) {
      setHoursNotice({ text: err.message, type: 'error' });
      showFeedback(err.message, 'error');
    } finally {
      setSavingHours(false);
    }
  };

  // TOGGLE BARBER ON-DUTY STATUS
  const handleToggleBarberDuty = async (barber) => {
    try {
      const nextDuty = !barber.onDuty;
      const res = await api.patch(`/admin/barbers/${barber.slug}/duty`, { onDuty: nextDuty });
      if (res.data?.barber) {
        showFeedback(`${barber.name}: ${t('admin.dutyUpdatedSuccess')}`, 'success');
        fetchAllBarbers();
        refreshQueue();
      }
    } catch (err) {
      showFeedback(err.message || t('admin.dutyError'), 'error');
    }
  };

  // TOGGLE SERVICE ACTIVE STATUS
  const handleToggleServiceActive = async (service) => {
    try {
      const nextActive = !service.isActive;
      await api.patch(`/admin/services/${service._id}`, { isActive: nextActive });
      showFeedback(t('admin.serviceUpdatedSuccess'), 'success');
      fetchAllServices();
      refreshQueue();
    } catch (err) {
      showFeedback(err.message || 'Failed to update service', 'error');
    }
  };

  // OPEN ADD / EDIT SERVICE MODAL
  const handleOpenAddService = () => {
    setEditingService(null);
    setServiceForm({
      nameEn: '',
      nameGu: '',
      durationMin: 20,
      price: 150,
      isActive: true,
    });
    setServiceFormError(null);
    setServiceModalOpen(true);
  };

  const handleOpenEditService = (service) => {
    setEditingService(service);
    setServiceForm({
      nameEn: service.nameEn || '',
      nameGu: service.nameGu || '',
      durationMin: service.durationMin || 20,
      price: service.price ?? 150,
      isActive: service.isActive !== false,
    });
    setServiceFormError(null);
    setServiceModalOpen(true);
  };

  // SUBMIT ADD / EDIT SERVICE
  const handleSaveService = async (e) => {
    e.preventDefault();
    if (!serviceForm.nameEn.trim() || !serviceForm.nameGu.trim()) {
      setServiceFormError('Both English and Gujarati service names are required.');
      return;
    }
    if (Number(serviceForm.durationMin) < 5) {
      setServiceFormError('Duration must be at least 5 minutes.');
      return;
    }
    if (Number(serviceForm.price) < 0) {
      setServiceFormError('Price cannot be negative.');
      return;
    }

    try {
      setSavingService(true);
      setServiceFormError(null);

      if (editingService) {
        // Update existing service
        await api.patch(`/admin/services/${editingService._id}`, {
          nameEn: serviceForm.nameEn.trim(),
          nameGu: serviceForm.nameGu.trim(),
          durationMin: Number(serviceForm.durationMin),
          price: Number(serviceForm.price),
          isActive: Boolean(serviceForm.isActive),
        });
        showFeedback(t('admin.serviceUpdatedSuccess'), 'success');
      } else {
        // Create new service
        await api.post('/admin/services', {
          nameEn: serviceForm.nameEn.trim(),
          nameGu: serviceForm.nameGu.trim(),
          durationMin: Number(serviceForm.durationMin),
          price: Number(serviceForm.price),
          isActive: Boolean(serviceForm.isActive),
        });
        showFeedback(t('admin.serviceCreatedSuccess'), 'success');
      }

      setServiceModalOpen(false);
      fetchAllServices();
      refreshQueue();
    } catch (err) {
      setServiceFormError(err.message || 'Failed to save service');
    } finally {
      setSavingService(false);
    }
  };

  // SUBMIT DELETE SERVICE
  const handleConfirmDelete = async () => {
    if (!deletingService) return;
    try {
      setDeletingLoading(true);
      await api.delete(`/admin/services/${deletingService._id}`);
      showFeedback(t('admin.serviceDeletedSuccess'), 'success');
      setDeletingService(null);
      fetchAllServices();
      refreshQueue();
    } catch (err) {
      showFeedback(err.message || 'Failed to delete service', 'error');
    } finally {
      setDeletingLoading(false);
    }
  };

  return (
    <StaffPinGate
      title={t('admin.title')}
      subtitle={t('admin.subtitle')}
    >
      <AppShell>
        <div className="max-w-4xl mx-auto space-y-8 pb-16">
          {/* Action Feedback Banner */}
          <AnimatePresence>
            {actionFeedback && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className={`p-4 rounded-2xl flex items-center justify-between gap-3 text-sm font-medium border shadow-glass-md ${
                  actionFeedback.type === 'error'
                    ? 'bg-rose-950/80 border-rose-500/40 text-rose-200'
                    : 'bg-emerald-950/80 border-emerald-500/40 text-emerald-200'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {actionFeedback.type === 'error' ? (
                    <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  )}
                  <span>{actionFeedback.message}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setActionFeedback(null)}
                  className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white min-h-[44px] min-w-[44px] flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* PAGE HEADER & QUICK LINKS */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-amber/15 border border-brand-amber/30 text-xs text-brand-glow font-medium mb-2">
                <ShieldAlert className="w-3.5 h-3.5 text-brand-amber" />
                <span>{t('admin.ownerBadge')} · {t('admin.ownerBadge', 'માલિક એડમિન')}</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-serif text-white tracking-tight">
                {t('admin.title')}
              </h1>
              <p className="text-slate-400 text-sm mt-1">
                {t('admin.subtitle')}
              </p>
            </div>

            {/* Quick Navigation Pills */}
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <Link
                to="/reception"
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-obsidian-900 border border-white/10 hover:border-white/20 text-xs text-slate-300 hover:text-white transition-colors min-h-[44px]"
              >
                <LayoutDashboard className="w-4 h-4 text-brand-amber" />
                <span>{t('admin.viewReception')}</span>
              </Link>
              <Link
                to="/display"
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-obsidian-900 border border-white/10 hover:border-white/20 text-xs text-slate-300 hover:text-white transition-colors min-h-[44px]"
              >
                <Tv className="w-4 h-4 text-brand-glow" />
                <span>{t('admin.viewTvDisplay')}</span>
              </Link>
            </div>
          </div>

          {/* SECTION 1: TODAY'S STATS (3-COLUMN GRID) */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-brand-amber" />
              <h2 className="text-lg font-serif text-white font-medium">
                {t('admin.todayStatsTitle')}
              </h2>
              <span className="text-xs text-slate-500 font-serif">·</span>
              <span className="text-xs text-slate-400 font-gujarati">
                {t('admin.todayStatsTitle')}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Metric 1: Customers Served */}
              <TactileCard className="p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-brand-amber/15 border border-brand-amber/30 flex items-center justify-center text-brand-amber shadow-amber-glow shrink-0">
                  <UserCheck className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs font-medium text-slate-400 block">
                    {t('admin.customersServed')}
                  </span>
                  <span className="text-3xl font-serif font-bold text-white tracking-tight tabular-nums block">
                    {todayStats?.servedCount ?? 0}
                  </span>
                  <span className="text-[11px] text-emerald-400 font-mono">
                    Completed today
                  </span>
                </div>
              </TactileCard>

              {/* Metric 2: Average Wait */}
              <TactileCard className="p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs font-medium text-slate-400 block">
                    {t('admin.avgWaitTime')}
                  </span>
                  <span className="text-3xl font-serif font-bold text-white tracking-tight tabular-nums block">
                    {todayStats?.avgWaitMin ?? 0} <span className="text-lg font-sans text-slate-400">min</span>
                  </span>
                  <span className="text-[11px] text-sky-400 font-mono">
                    Door to chair
                  </span>
                </div>
              </TactileCard>

              {/* Metric 3: No-Shows */}
              <TactileCard className="p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                  <UserX className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs font-medium text-slate-400 block">
                    {t('admin.noShows')}
                  </span>
                  <span className="text-3xl font-serif font-bold text-white tracking-tight tabular-nums block">
                    {todayStats?.noShowCount ?? 0}
                  </span>
                  <span className="text-[11px] text-rose-400 font-mono">
                    Unclaimed turns
                  </span>
                </div>
              </TactileCard>
            </div>
          </section>

          {/* SECTION 2: QUEUE CONTROL & OPERATING HOURS */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-brand-amber" />
              <h2 className="text-lg font-serif text-white font-medium">
                {t('admin.queueControlTitle')}
              </h2>
              <span className="text-xs text-slate-500 font-serif">·</span>
              <span className="text-xs text-slate-400 font-gujarati">
                {t('admin.queueControlSubtitle')}
              </span>
            </div>

            {/* Master Queue Open / Closed Tactile Switch Card */}
            <TactileCard className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-xl font-serif font-bold text-white">
                      {salonConfig?.isQueueOpen
                        ? t('admin.queueOpenTitle')
                        : t('admin.queueClosedTitle')}
                    </h3>
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold ${
                        salonConfig?.isQueueOpen
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          salonConfig?.isQueueOpen ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
                        }`}
                      />
                      {salonConfig?.isQueueOpen ? 'OPEN' : 'CLOSED'}
                    </span>
                  </div>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    {salonConfig?.isQueueOpen
                      ? t('admin.queueOpenDesc')
                      : t('admin.queueClosedDesc')}
                  </p>
                </div>

                {/* Tactile Big Spring Toggle */}
                <button
                  type="button"
                  onClick={handleToggleQueueOpen}
                  aria-pressed={salonConfig?.isQueueOpen}
                  className={`relative w-20 h-11 rounded-full p-1 transition-colors duration-300 focus:outline-none min-h-[44px] min-w-[44px] shrink-0 ${
                    salonConfig?.isQueueOpen
                      ? 'bg-emerald-600 shadow-[0_0_20px_rgba(16,185,129,0.35)]'
                      : 'bg-obsidian-800 border border-white/20'
                  }`}
                >
                  <motion.div
                    animate={{ x: salonConfig?.isQueueOpen ? 36 : 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    className="w-9 h-9 rounded-full bg-white shadow-md flex items-center justify-center text-obsidian-950 font-bold"
                  >
                    {salonConfig?.isQueueOpen ? (
                      <Check className="w-5 h-5 text-emerald-600" />
                    ) : (
                      <X className="w-5 h-5 text-slate-600" />
                    )}
                  </motion.div>
                </button>
              </div>

              {/* Operating Hours Form Strip */}
              <div className="mt-6 pt-6 border-t border-white/[0.08]">
                <form
                  onSubmit={handleSaveHours}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div>
                    <h4 className="text-sm font-medium text-white flex items-center gap-2">
                      <Clock className="w-4 h-4 text-brand-amber" />
                      <span>{t('admin.operatingHoursTitle')}</span>
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Daily online queue automatically pauses 30 minutes before closing.
                    </p>
                  </div>

                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-2 bg-obsidian-900 border border-white/10 rounded-xl px-3 py-1.5 min-h-[44px]">
                      <span className="text-xs text-slate-400 font-mono">Open:</span>
                      <input
                        type="time"
                        value={openTime}
                        onChange={(e) => setOpenTime(e.target.value)}
                        className="bg-transparent text-white text-sm font-mono focus:outline-none min-h-[36px]"
                        required
                      />
                    </div>

                    <div className="flex items-center gap-2 bg-obsidian-900 border border-white/10 rounded-xl px-3 py-1.5 min-h-[44px]">
                      <span className="text-xs text-slate-400 font-mono">Close:</span>
                      <input
                        type="time"
                        value={closeTime}
                        onChange={(e) => setCloseTime(e.target.value)}
                        className="bg-transparent text-white text-sm font-mono focus:outline-none min-h-[36px]"
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={savingHours}
                      className="px-5 py-2.5 rounded-xl bg-brand-amber/20 hover:bg-brand-amber/30 text-brand-glow border border-brand-amber/40 font-semibold text-xs transition-all shadow-amber-glow min-h-[44px] flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {savingHours ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>{t('admin.savingHours')}</span>
                        </>
                      ) : (
                        <span>{t('admin.saveHoursBtn')}</span>
                      )}
                    </button>
                  </div>
                </form>

                {hoursNotice && (
                  <p
                    className={`text-xs mt-2 font-mono ${
                      hoursNotice.type === 'error' ? 'text-rose-400' : 'text-emerald-400'
                    }`}
                  >
                    {hoursNotice.text}
                  </p>
                )}
              </div>
            </TactileCard>
          </section>

          {/* SECTION 3: BARBER ON-DUTY MANAGEMENT */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Scissors className="w-4 h-4 text-brand-amber -rotate-45" />
                <h2 className="text-lg font-serif text-white font-medium">
                  {t('admin.barberRosterTitle')}
                </h2>
                <span className="text-xs text-slate-500 font-serif">·</span>
                <span className="text-xs text-slate-400 font-gujarati">
                  {t('admin.barberRosterSubtitle')}
                </span>
              </div>

              {loadingBarbers && (
                <Loader2 className="w-4 h-4 text-brand-amber animate-spin" />
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {allBarbers.map((barber) => {
                const isServing = barber.status === 'busy' || barber.currentTicketId;
                const isOnBreak = barber.status === 'on_break';

                return (
                  <TactileCard
                    key={barber._id || barber.slug}
                    className={`p-5 flex flex-col justify-between transition-all ${
                      barber.onDuty
                        ? 'border-white/10'
                        : 'border-white/5 opacity-60 bg-obsidian-950/60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      {/* Barber Avatar & Info */}
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-brand-amber/25 via-brand-gold/15 to-transparent border border-brand-amber/30 flex items-center justify-center text-lg font-serif font-bold text-brand-glow shadow-sm shrink-0">
                          {barber.name?.[0] || 'B'}
                        </div>
                        <div>
                          <h3 className="text-base font-serif font-bold text-white">
                            {barber.name}
                          </h3>
                          <p className="text-xs text-slate-400 font-medium">
                            {isGujarati ? barber.specialtyGu : barber.specialtyEn}
                          </p>
                        </div>
                      </div>

                      {/* On/Off Duty Switch */}
                      <button
                        type="button"
                        onClick={() => handleToggleBarberDuty(barber)}
                        title={barber.onDuty ? 'Take off duty' : 'Put on duty'}
                        className={`relative w-12 h-7 rounded-full p-0.5 transition-colors duration-200 focus:outline-none min-h-[44px] min-w-[44px] flex items-center shrink-0 ${
                          barber.onDuty ? 'bg-emerald-600' : 'bg-obsidian-800 border border-white/20'
                        }`}
                      >
                        <motion.div
                          animate={{ x: barber.onDuty ? 20 : 0 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                          className="w-6 h-6 rounded-full bg-white shadow-sm flex items-center justify-center text-obsidian-950 text-xs font-bold"
                        >
                          {barber.onDuty ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <X className="w-3.5 h-3.5 text-slate-400" />
                          )}
                        </motion.div>
                      </button>
                    </div>

                    {/* Status Pill Footer */}
                    <div className="mt-4 pt-3 border-t border-white/[0.08] flex items-center justify-between text-xs">
                      <span className="font-mono text-slate-400">
                        {barber.onDuty ? t('admin.onDuty') : t('admin.offDuty')}
                      </span>

                      <div>
                        {isServing ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-[11px] font-semibold">
                            Serving
                          </span>
                        ) : isOnBreak ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono text-[11px] font-semibold">
                            On Break
                          </span>
                        ) : barber.onDuty ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/5 text-slate-300 font-mono text-[11px]">
                            Available
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/5 text-slate-500 font-mono text-[11px]">
                            Inactive
                          </span>
                        )}
                      </div>
                    </div>
                  </TactileCard>
                );
              })}
            </div>
          </section>

          {/* SECTION 4: SERVICES MANAGEMENT */}
          <section className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-brand-amber" />
                <h2 className="text-lg font-serif text-white font-medium">
                  {t('admin.servicesTitle')}
                </h2>
                <span className="text-xs text-slate-500 font-serif">·</span>
                <span className="text-xs text-slate-400 font-gujarati">
                  {t('admin.servicesSubtitle')}
                </span>
              </div>

              {/* Add Service Button */}
              <button
                type="button"
                onClick={handleOpenAddService}
                className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-amber to-brand-gold text-obsidian-950 font-bold text-xs tracking-wide hover:shadow-amber-glow transition-all min-h-[44px]"
              >
                <Plus className="w-4 h-4" />
                <span>{t('admin.addServiceBtn')}</span>
              </button>
            </div>

            {/* Service List Grid */}
            <div className="space-y-3">
              {allServices.map((service) => (
                <TactileCard
                  key={service._id}
                  className={`p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
                    service.isActive
                      ? 'border-white/10'
                      : 'border-white/5 opacity-60 bg-obsidian-950/60'
                  }`}
                >
                  {/* Left: Titles & Metrics */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h3 className="text-base font-serif font-bold text-white tracking-wide">
                        {service.nameEn}
                      </h3>
                      <span className="text-xs text-slate-400 font-gujarati">
                        {service.nameGu}
                      </span>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                          service.isActive
                            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                            : 'bg-slate-500/15 text-slate-400 border border-white/10'
                        }`}
                      >
                        {service.isActive ? t('admin.serviceActive') : t('admin.serviceInactive')}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 mt-2 text-xs font-mono">
                      <span className="text-brand-amber font-semibold">
                        ₹{service.price}
                      </span>
                      <span className="text-slate-600">·</span>
                      <span className="text-slate-400">
                        {service.durationMin} {t('queue.minutesSuffix')}
                      </span>
                    </div>
                  </div>

                  {/* Right: Actions (Active Toggle, Edit, Delete) */}
                  <div className="flex items-center gap-2 sm:gap-3 self-end sm:self-center">
                    {/* Active/Inactive Toggle */}
                    <button
                      type="button"
                      onClick={() => handleToggleServiceActive(service)}
                      title={service.isActive ? 'Disable service' : 'Enable service'}
                      className={`relative w-12 h-7 rounded-full p-0.5 transition-colors duration-200 focus:outline-none min-h-[44px] min-w-[44px] flex items-center shrink-0 ${
                        service.isActive ? 'bg-emerald-600' : 'bg-obsidian-800 border border-white/20'
                      }`}
                    >
                      <motion.div
                        animate={{ x: service.isActive ? 20 : 0 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        className="w-6 h-6 rounded-full bg-white shadow-sm flex items-center justify-center text-obsidian-950 text-xs font-bold"
                      >
                        {service.isActive ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <X className="w-3.5 h-3.5 text-slate-400" />
                        )}
                      </motion.div>
                    </button>

                    {/* Edit Button */}
                    <button
                      type="button"
                      onClick={() => handleOpenEditService(service)}
                      className="p-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 hover:text-white transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                      title={t('admin.editService')}
                    >
                      <Pencil className="w-4 h-4" />
                    </button>

                    {/* Delete Button */}
                    <button
                      type="button"
                      onClick={() => setDeletingService(service)}
                      className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 text-rose-300 hover:text-rose-200 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                      title={t('admin.deleteService')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </TactileCard>
              ))}

              {allServices.length === 0 && !loadingServices && (
                <div className="p-8 text-center rounded-2xl bg-obsidian-900/40 border border-white/5 text-slate-400 text-sm">
                  No services found. Click '+ Add Service' above to create one.
                </div>
              )}
            </div>
          </section>
        </div>

        {/* MODAL: ADD / EDIT SERVICE */}
        <AnimatePresence>
          {serviceModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-obsidian-950/80 backdrop-blur-md">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-lg bg-obsidian-900 border border-white/10 rounded-3xl p-6 sm:p-8 shadow-glass-lg relative overflow-hidden"
              >
                <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
                  <div className="flex items-center gap-2">
                    <Scissors className="w-5 h-5 text-brand-amber -rotate-45" />
                    <h3 className="text-xl font-serif font-bold text-white">
                      {editingService ? t('admin.editService') : t('admin.addServiceBtn')}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setServiceModalOpen(false)}
                    className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 min-h-[44px] min-w-[44px] flex items-center justify-center"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {serviceFormError && (
                  <div className="mt-4 p-3 rounded-xl bg-rose-950/60 border border-rose-500/30 text-rose-200 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                    <span>{serviceFormError}</span>
                  </div>
                )}

                <form onSubmit={handleSaveService} className="mt-5 space-y-4">
                  {/* Name (English) */}
                  <div>
                    <label className="block text-xs font-mono text-slate-300 mb-1.5">
                      {t('admin.nameEnLabel')} *
                    </label>
                    <input
                      type="text"
                      value={serviceForm.nameEn}
                      onChange={(e) => setServiceForm({ ...serviceForm, nameEn: e.target.value })}
                      placeholder="e.g. Classic Haircut"
                      className="w-full px-4 py-3 rounded-xl bg-obsidian-850 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-brand-amber min-h-[44px]"
                      required
                    />
                  </div>

                  {/* Name (Gujarati) */}
                  <div>
                    <label className="block text-xs font-mono text-slate-300 mb-1.5">
                      {t('admin.nameGuLabel')} *
                    </label>
                    <input
                      type="text"
                      value={serviceForm.nameGu}
                      onChange={(e) => setServiceForm({ ...serviceForm, nameGu: e.target.value })}
                      placeholder="e.g. ક્લાસિક હેરકટ"
                      className="w-full px-4 py-3 rounded-xl bg-obsidian-850 border border-white/10 text-white placeholder-slate-500 text-sm font-gujarati focus:outline-none focus:border-brand-amber min-h-[44px]"
                      required
                    />
                  </div>

                  {/* Duration & Price Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-mono text-slate-300 mb-1.5">
                        {t('admin.durationLabel')} *
                      </label>
                      <input
                        type="number"
                        min="5"
                        max="240"
                        value={serviceForm.durationMin}
                        onChange={(e) => setServiceForm({ ...serviceForm, durationMin: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl bg-obsidian-850 border border-white/10 text-white text-sm font-mono focus:outline-none focus:border-brand-amber min-h-[44px]"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-mono text-slate-300 mb-1.5">
                        {t('admin.priceLabel')} *
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={serviceForm.price}
                        onChange={(e) => setServiceForm({ ...serviceForm, price: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl bg-obsidian-850 border border-white/10 text-white text-sm font-mono focus:outline-none focus:border-brand-amber min-h-[44px]"
                        required
                      />
                    </div>
                  </div>

                  {/* Active Toggle Switch */}
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs font-mono text-slate-300">
                      {t('admin.serviceActive')} Status:
                    </span>
                    <button
                      type="button"
                      onClick={() => setServiceForm({ ...serviceForm, isActive: !serviceForm.isActive })}
                      className={`relative w-12 h-7 rounded-full p-0.5 transition-colors duration-200 min-h-[44px] min-w-[44px] flex items-center shrink-0 ${
                        serviceForm.isActive ? 'bg-emerald-600' : 'bg-obsidian-800 border border-white/20'
                      }`}
                    >
                      <motion.div
                        animate={{ x: serviceForm.isActive ? 20 : 0 }}
                        className="w-6 h-6 rounded-full bg-white shadow-sm flex items-center justify-center text-obsidian-950 text-xs font-bold"
                      >
                        {serviceForm.isActive ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <X className="w-3.5 h-3.5 text-slate-400" />
                        )}
                      </motion.div>
                    </button>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/[0.08]">
                    <button
                      type="button"
                      onClick={() => setServiceModalOpen(false)}
                      className="px-5 py-2.5 rounded-xl border border-white/10 text-slate-300 hover:text-white hover:bg-white/5 text-xs font-medium min-h-[44px]"
                    >
                      {t('admin.cancelBtn')}
                    </button>
                    <button
                      type="submit"
                      disabled={savingService}
                      className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-brand-amber to-brand-gold text-obsidian-950 font-bold text-xs tracking-wide hover:shadow-amber-glow transition-all min-h-[44px] flex items-center gap-2 disabled:opacity-50"
                    >
                      {savingService && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      <span>{editingService ? t('admin.saveServiceBtn') : t('admin.createServiceBtn')}</span>
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* MODAL: DELETE CONFIRMATION */}
        <AnimatePresence>
          {deletingService && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-obsidian-950/80 backdrop-blur-md">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-md bg-obsidian-900 border border-white/10 rounded-3xl p-6 shadow-glass-lg"
              >
                <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-4">
                  <Trash2 className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-serif font-bold text-white">
                  {t('admin.deleteConfirmTitle')}
                </h3>
                <p className="text-slate-400 text-sm mt-2 leading-relaxed">
                  {t('admin.deleteConfirmDesc', {
                    name: `${deletingService.nameEn} (${deletingService.nameGu})`,
                  })}
                </p>

                <div className="flex items-center justify-end gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setDeletingService(null)}
                    className="px-5 py-2.5 rounded-xl border border-white/10 text-slate-300 hover:text-white hover:bg-white/5 text-xs font-medium min-h-[44px]"
                  >
                    {t('admin.cancelBtn')}
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmDelete}
                    disabled={deletingLoading}
                    className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs tracking-wide transition-all min-h-[44px] flex items-center gap-2 disabled:opacity-50"
                  >
                    {deletingLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>{t('admin.confirmDeleteBtn')}</span>
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </AppShell>
    </StaffPinGate>
  );
};

export default AdminPage;

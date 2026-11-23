import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Delete, ArrowLeft, ShieldCheck, KeyRound, AlertCircle, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api.js';
import { useLanguage } from '../../context/LanguageContext.jsx';
import { springSnappy } from '../../lib/motion.js';

/**
 * Reusable Staff PIN Authorization Gate
 * Wraps protected views (/reception, /barber/:name, /admin).
 */
export const StaffPinGate = ({ children, title, subtitle }) => {
  const { t, isGujarati } = useLanguage();
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return Boolean(sessionStorage.getItem('salon_staff_pin'));
  });

  const [pin, setPin] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // Listen for auth cleared events (e.g. 401 received from API)
  useEffect(() => {
    const handleAuthCleared = () => {
      setIsAuthenticated(false);
      setPin('');
      setError(t('staff.sessionExpired', 'Session expired. Please enter PIN.'));
    };

    window.addEventListener('salon:auth_cleared', handleAuthCleared);
    return () => window.removeEventListener('salon:auth_cleared', handleAuthCleared);
  }, [t]);

  // Submit PIN for verification
  const verifyPinCode = useCallback(
    async (codeToVerify) => {
      if (codeToVerify.length !== 4) return;
      try {
        setLoading(true);
        setError(null);
        const res = await api.post('/auth/verify-pin', { pin: codeToVerify });
        if (res.data?.valid) {
          sessionStorage.setItem('salon_staff_pin', codeToVerify);
          setIsAuthenticated(true);
        } else {
          setError(t('staff.invalidPin', 'Invalid staff PIN'));
          setPin('');
        }
      } catch (err) {
        setError(err.message || t('staff.invalidPin', 'Invalid staff PIN'));
        setPin('');
      } finally {
        setLoading(false);
      }
    },
    [t]
  );

  // Auto-verify when 4 digits are entered
  useEffect(() => {
    if (pin.length === 4) {
      verifyPinCode(pin);
    }
  }, [pin, verifyPinCode]);

  // Physical keyboard support
  useEffect(() => {
    if (isAuthenticated) return;

    const handleKeyDown = (e) => {
      if (loading) return;
      if (/^[0-9]$/.test(e.key)) {
        if (pin.length < 4) {
          setPin((prev) => prev + e.key);
          if (error) setError(null);
        }
      } else if (e.key === 'Backspace') {
        setPin((prev) => prev.slice(0, -1));
        if (error) setError(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAuthenticated, pin, loading, error]);

  const handleKeypadPress = (val) => {
    if (loading) return;
    if (error) setError(null);

    if (val === 'clear') {
      setPin('');
    } else if (val === 'backspace') {
      setPin((prev) => prev.slice(0, -1));
    } else if (pin.length < 4) {
      setPin((prev) => prev + val);
    }
  };

  if (isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-8 bg-obsidian-950 text-slate-100 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute w-[500px] h-[500px] bg-brand-amber/[0.04] rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Back Link */}
      <div className="w-full max-w-sm mb-4">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-white transition-colors min-h-[44px] px-2 rounded-lg"
        >
          <ArrowLeft className="w-4 h-4 text-brand-amber" />
          <span>{t('nav.back')}</span>
        </Link>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={springSnappy}
        className="w-full max-w-sm p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-obsidian-900/90 to-obsidian-950/95 border border-white/[0.12] backdrop-blur-2xl shadow-glass-lg space-y-6 text-center"
      >
        {/* Header Icon & Title */}
        <div className="space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-brand-amber/15 border border-brand-amber/30 flex items-center justify-center text-brand-amber mx-auto shadow-amber-glow">
            <Lock className="w-6 h-6" />
          </div>

          <h2 className="text-xl sm:text-2xl font-serif text-white font-semibold">
            {title || t('staff.gateTitle', 'Staff Access · સ્ટાફ પ્રવેશ')}
          </h2>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            {subtitle || t('staff.gateSubtitle', 'Enter your 4-digit staff PIN to unlock this console')}
          </p>
        </div>

        {/* 4 Digit Dots / Display */}
        <div className="flex items-center justify-center gap-3.5 py-2">
          {[0, 1, 2, 3].map((idx) => {
            const hasDigit = pin.length > idx;
            return (
              <div
                key={idx}
                className={`w-11 h-13 rounded-2xl border flex items-center justify-center text-xl font-mono font-bold transition-all ${
                  hasDigit
                    ? 'border-brand-amber bg-brand-amber/10 text-brand-glow shadow-sm'
                    : 'border-white/10 bg-obsidian-950/70 text-slate-600'
                }`}
              >
                {hasDigit ? '●' : ''}
              </div>
            );
          })}
        </div>

        {/* Error Notice */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-center gap-2"
            >
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 4-digit Keypad */}
        <div className="grid grid-cols-3 gap-2.5 max-w-[260px] mx-auto select-none">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => handleKeypadPress(String(num))}
              disabled={loading}
              className="h-13 w-13 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] active:bg-brand-amber/20 border border-white/[0.07] text-lg font-mono font-medium text-white transition-all flex items-center justify-center min-h-[48px] min-w-[48px] mx-auto active:scale-95"
            >
              {num}
            </button>
          ))}

          {/* Bottom row: Clear, 0, Backspace */}
          <button
            type="button"
            onClick={() => handleKeypadPress('clear')}
            disabled={loading}
            className="h-13 w-13 rounded-2xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.05] text-xs font-mono text-slate-400 transition-all flex items-center justify-center min-h-[48px] min-w-[48px] mx-auto"
          >
            C
          </button>

          <button
            type="button"
            onClick={() => handleKeypadPress('0')}
            disabled={loading}
            className="h-13 w-13 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] active:bg-brand-amber/20 border border-white/[0.07] text-lg font-mono font-medium text-white transition-all flex items-center justify-center min-h-[48px] min-w-[48px] mx-auto active:scale-95"
          >
            0
          </button>

          <button
            type="button"
            onClick={() => handleKeypadPress('backspace')}
            disabled={loading}
            className="h-13 w-13 rounded-2xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.05] text-slate-400 transition-all flex items-center justify-center min-h-[48px] min-w-[48px] mx-auto"
            aria-label="Delete"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        {/* Demo Hint Banner */}
        <div className="pt-2 border-t border-white/[0.06]">
          <button
            type="button"
            onClick={() => setPin('1234')}
            className="text-[11px] text-slate-400 hover:text-brand-glow flex items-center justify-center gap-1.5 mx-auto py-1 px-3 rounded-full bg-white/[0.03] border border-white/5"
          >
            <KeyRound className="w-3.5 h-3.5 text-brand-amber" />
            <span>{t('staff.demoPinHint', 'Demo PIN: 1234 (Tap to auto-fill)')}</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default StaffPinGate;

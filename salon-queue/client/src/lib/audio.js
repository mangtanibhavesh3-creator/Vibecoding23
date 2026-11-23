/**
 * Web Audio API Pleasant Chime & Mobile Haptic Vibration Generator
 * Used when a customer's token transitions to 'called' ("It's your turn!").
 */

let audioCtx = null;

const getAudioContext = () => {
  if (!audioCtx && typeof window !== 'undefined') {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  return audioCtx;
};

/**
 * Plays a pleasant 3-tone harmonic chime (C5 -> E5 -> G5)
 */
export const playChime = () => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5

    notes.forEach((freq, idx) => {
      const startTime = now + idx * 0.12;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      // Volume envelope with warm decay
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.18, startTime + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.8);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.85);
    });
  } catch (err) {
    console.warn('[Audio] Could not play alert chime:', err);
  }
};

/**
 * Triggers mobile device vibration pattern: buzz, pause, buzz
 */
export const triggerVibration = (pattern = [250, 120, 250]) => {
  try {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  } catch (err) {
    console.warn('[Haptics] Vibration not supported or allowed:', err);
  }
};

/**
 * Unified turn notification: haptic vibration + pleasant chime
 */
export const triggerTurnAlert = () => {
  triggerVibration();
  playChime();
};

export default {
  playChime,
  triggerVibration,
  triggerTurnAlert,
};

/**
 * Salon Time Utilities (Asia/Kolkata IST)
 * Pure helper module for timezone-aware date keys and operating window evaluations.
 */

const TIMEZONE = 'Asia/Kolkata';

/**
 * Returns the current date key in "YYYY-MM-DD" format according to Indian Standard Time (IST).
 * @param {Date} [date=new Date()]
 * @returns {string} Formatted "YYYY-MM-DD"
 */
export const getIstDateKey = (date = new Date()) => {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date);
};

/**
 * Parses a "HH:MM" 24-hour time string into total minutes from midnight.
 * @param {string} timeStr - e.g. "09:00" or "21:00"
 * @returns {number}
 */
const parseTimeToMinutes = (timeStr = '00:00') => {
  const [hours, minutes] = timeStr.split(':').map((num) => parseInt(num, 10) || 0);
  return hours * 60 + minutes;
};

/**
 * Converts "HH:MM" 24-hour string to a friendly 12-hour formatted time (e.g. "09:00 PM IST").
 * @param {string} timeStr - e.g. "21:00"
 * @returns {string} e.g. "9:00 PM"
 */
const format12Hour = (timeStr = '21:00') => {
  const [hours, minutes] = timeStr.split(':').map((num) => parseInt(num, 10) || 0);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  const displayMins = minutes.toString().padStart(2, '0');
  return `${displayHours}:${displayMins} ${period}`;
};

/**
 * Evaluates whether online queue registration is permitted based on salon config
 * and current IST wall-clock time.
 *
 * @param {Object} salonConfig - SalonConfig document with isQueueOpen, openTime, closeTime, onlineCutoffMinutes
 * @param {Date} [now=new Date()] - Evaluation time
 * @returns {{
 *   isOpen: boolean,
 *   reason: 'open' | 'manual_closed' | 'before_open' | 'cutoff_closed',
 *   closeTimeFormatted: string
 * }}
 */
export const evaluateOnlineJoiningStatus = (salonConfig, now = new Date()) => {
  const openTime = salonConfig?.openTime || '09:00';
  const closeTime = salonConfig?.closeTime || '21:00';
  const cutoffMinutes = salonConfig?.onlineCutoffMinutes ?? 30;
  const isQueueOpen = salonConfig?.isQueueOpen ?? true;

  const closeTimeFormatted = format12Hour(closeTime);

  // 1. Check manual override toggle
  if (!isQueueOpen) {
    return {
      isOpen: false,
      reason: 'manual_closed',
      closeTimeFormatted,
    };
  }

  // 2. Extract current IST hours & minutes
  const istParts = new Intl.DateTimeFormat('en-US', {
    timeZone: TIMEZONE,
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).formatToParts(now);

  const currentHour = parseInt(istParts.find((p) => p.type === 'hour')?.value || '0', 10);
  const currentMinute = parseInt(istParts.find((p) => p.type === 'minute')?.value || '0', 10);
  const currentTotalMinutes = currentHour * 60 + currentMinute;

  const openTotalMinutes = parseTimeToMinutes(openTime);
  const closeTotalMinutes = parseTimeToMinutes(closeTime);
  const effectiveCutoffMinutes = closeTotalMinutes - cutoffMinutes;

  // 3. Before salon opening
  if (currentTotalMinutes < openTotalMinutes) {
    return {
      isOpen: false,
      reason: 'before_open',
      closeTimeFormatted,
    };
  }

  // 4. Past online cutoff threshold (e.g. within 30 mins of closing)
  if (currentTotalMinutes >= effectiveCutoffMinutes) {
    return {
      isOpen: false,
      reason: 'cutoff_closed',
      closeTimeFormatted,
    };
  }

  // 5. Permitted
  return {
    isOpen: true,
    reason: 'open',
    closeTimeFormatted,
  };
};

export default {
  getIstDateKey,
  evaluateOnlineJoiningStatus,
};

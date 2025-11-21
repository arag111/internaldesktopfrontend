/**
 * Centralized Timezone Utility for TrackNexus
 *
 * This utility provides consistent timezone handling across the application.
 * It uses the browser's detected timezone by default, with IST as fallback.
 *
 * @author Claude Code
 * @date 2025-11-15
 */

import { format, startOfDay, endOfDay } from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';

/**
 * Get user's timezone from browser or use IST as fallback
 * Can be enhanced to read from user profile in the future
 */
export const getUserTimezone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';
  } catch {
    return 'Asia/Kolkata'; // Default to IST
  }
};

/**
 * Convert a UTC date to user's timezone
 * @param date Date in UTC
 * @returns Date object in user's timezone
 */
export const toUserTimezone = (date: Date): Date => {
  const timezone = getUserTimezone();
  return toZonedTime(date, timezone);
};

/**
 * Convert a date from user's timezone to UTC
 * @param date Date in user's timezone
 * @returns Date object in UTC
 */
export const fromUserTimezone = (date: Date): Date => {
  const timezone = getUserTimezone();
  return fromZonedTime(date, timezone);
};

/**
 * Get start of day in user's timezone, returned as UTC
 * @param date Any date
 * @returns Start of day (00:00:00) in user's timezone, as UTC
 */
export const getStartOfDay = (date: Date): Date => {
  const timezone = getUserTimezone();
  const zonedDate = toZonedTime(date, timezone);
  const start = startOfDay(zonedDate);
  return fromZonedTime(start, timezone);
};

/**
 * Get end of day in user's timezone, returned as UTC
 * @param date Any date
 * @returns End of day (23:59:59.999) in user's timezone, as UTC
 */
export const getEndOfDay = (date: Date): Date => {
  const timezone = getUserTimezone();
  const zonedDate = toZonedTime(date, timezone);
  const end = endOfDay(zonedDate);
  return fromZonedTime(end, timezone);
};

/**
 * Format a date in user's timezone
 * @param date Date to format (can be UTC or any timezone)
 * @param formatString Format string (e.g., 'yyyy-MM-dd HH:mm:ss')
 * @returns Formatted date string in user's timezone
 */
export const formatInUserTimezone = (
  date: Date,
  formatString: string
): string => {
  const timezone = getUserTimezone();
  const zonedDate = toZonedTime(date, timezone);
  return format(zonedDate, formatString);
};

/**
 * Convert datetime-local string to ISO string (for API calls)
 * Datetime-local strings don't have timezone info, so they're treated as local time
 * @param datetimeLocal String in format "2025-11-15T18:30"
 * @returns ISO string in UTC
 */
export const datetimeLocalToISO = (datetimeLocal: string): string => {
  // Parse as local time (browser's timezone)
  const date = new Date(datetimeLocal);
  return date.toISOString();
};

/**
 * Convert ISO string to datetime-local format (for input fields)
 * @param iso ISO string in UTC (e.g., "2025-11-15T18:30:00.000Z")
 * @returns Datetime-local string (e.g., "2025-11-15T18:30")
 */
export const ISOToDatetimeLocal = (iso: string): string => {
  const date = new Date(iso);
  // Convert to local timezone and format for datetime-local input
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

/**
 * ✅ IST TIMEZONE UTILITIES
 * TrackNexus is IST-centric (server and users in India)
 * These functions handle IST date conversions consistently
 */

/**
 * Convert a date to IST (UTC+5:30)
 * Used for converting browser dates to IST before sending to API
 *
 * @param date Date in any timezone
 * @returns Date object adjusted to IST
 *
 * @example
 * const now = new Date(); // User's local time
 * const istDate = toISTDate(now); // Converted to IST
 * const dateString = format(istDate, 'yyyy-MM-dd'); // Format for API
 */
export const toISTDate = (date: Date): Date => {
  const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
  const istOffset = 5.5 * 60 * 60 * 1000; // IST is UTC+5:30
  return new Date(utc + istOffset);
};

/**
 * Format a date as IST date string (YYYY-MM-DD)
 * Convenience function for API calls
 *
 * @param date Date to format
 * @returns Date string in YYYY-MM-DD format (IST)
 *
 * @example
 * formatISTDate(new Date()) // "2025-11-21"
 */
export const formatISTDate = (date: Date): string => {
  const istDate = toISTDate(date);
  return format(istDate, 'yyyy-MM-dd');
};

/**
 * Get today's date in IST as a string
 *
 * @returns Today's date in IST (YYYY-MM-DD)
 *
 * @example
 * getTodayIST() // "2025-11-21"
 */
export const getTodayIST = (): string => {
  return formatISTDate(new Date());
};

/**
 * Convert date range to IST date strings
 * Helper for API calls with date ranges
 *
 * @param start Start date
 * @param end End date
 * @returns Object with start and end as IST date strings
 *
 * @example
 * const range = formatISTDateRange(startDate, endDate);
 * // { start: "2025-11-20", end: "2025-11-21" }
 */
export const formatISTDateRange = (start: Date, end: Date): { start: string; end: string } => {
  return {
    start: formatISTDate(start),
    end: formatISTDate(end)
  };
};

/**
 * Get current date/time in user's timezone
 */
export const getNow = (): Date => {
  return toUserTimezone(new Date());
};

/**
 * Check if two dates are on the same day in user's timezone
 */
export const isSameDay = (date1: Date, date2: Date): boolean => {
  const tz = getUserTimezone();
  const zoned1 = toZonedTime(date1, tz);
  const zoned2 = toZonedTime(date2, tz);

  return (
    zoned1.getFullYear() === zoned2.getFullYear() &&
    zoned1.getMonth() === zoned2.getMonth() &&
    zoned1.getDate() === zoned2.getDate()
  );
};

/**
 * Get timezone abbreviation (e.g., "IST", "PST")
 */
export const getTimezoneAbbreviation = (): string => {
  const timezone = getUserTimezone();

  // Common timezone abbreviations
  const abbrevMap: { [key: string]: string } = {
    'Asia/Kolkata': 'IST',
    'America/New_York': 'EST/EDT',
    'America/Los_Angeles': 'PST/PDT',
    'America/Chicago': 'CST/CDT',
    'Europe/London': 'GMT/BST',
    'Asia/Tokyo': 'JST',
    'Australia/Sydney': 'AEST/AEDT'
  };

  return abbrevMap[timezone] || timezone;
};

/**
 * Format date range for display
 * @param startDate Start date
 * @param endDate End date
 * @returns Formatted string like "Nov 15, 2025 - Nov 16, 2025"
 */
export const formatDateRange = (startDate: Date, endDate: Date): string => {
  const start = formatInUserTimezone(startDate, 'MMM d, yyyy');
  const end = formatInUserTimezone(endDate, 'MMM d, yyyy');

  if (start === end) {
    return start;
  }

  return `${start} - ${end}`;
};

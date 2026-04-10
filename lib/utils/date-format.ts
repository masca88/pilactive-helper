/**
 * Italian date formatting utilities for event display
 * Uses native Intl.DateTimeFormat API for zero-dependency, optimized formatting
 */

/**
 * Formatta una data completa in italiano
 * @example formatEventDate("2026-04-17") → "giovedì 17 aprile 2026"
 * @param date Date object or ISO date string
 * @returns Formatted Italian date with weekday, day, month, and year
 */
export function formatEventDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  return new Intl.DateTimeFormat('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(dateObj);
}

/**
 * Formatta l'orario dell'evento
 * ShaggyOwl API returns time already formatted as "HH:mm", so this is a passthrough
 * @example formatEventTime("08:00") → "08:00"
 * @param time Time string in "HH:mm" format
 * @returns Same time string (passthrough)
 */
export function formatEventTime(time: string): string {
  return time;
}

/**
 * Formatta un range di orari
 * @example formatEventTimeRange("08:00", "09:00") → "08:00 - 09:00"
 * @param start Start time in "HH:mm" format
 * @param end End time in "HH:mm" format
 * @returns Formatted time range
 */
export function formatEventTimeRange(start: string, end: string): string {
  return `${start} - ${end}`;
}

/**
 * Formatta data relativa rispetto ad oggi
 * @example formatRelativeDate(tomorrow) → "Domani"
 * @example formatRelativeDate(in5Days) → "Tra 5 giorni"
 * @param date Date object or ISO date string
 * @returns Relative date string in Italian
 */
export function formatRelativeDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();

  // Reset hours to compare only dates (ignore time of day)
  const dateOnly = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
  const nowOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const diffDays = Math.ceil((dateOnly.getTime() - nowOnly.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Oggi';
  if (diffDays === 1) return 'Domani';
  if (diffDays === -1) return 'Ieri';
  if (diffDays > 1) return `Tra ${diffDays} giorni`;
  return `${Math.abs(diffDays)} giorni fa`;
}

/**
 * Calculate booking execution time using Temporal API for DST-safe date arithmetic
 *
 * Given an event datetime, calculates when to execute the booking (7 days before
 * at the same local time in Europe/Rome timezone).
 *
 * Temporal's ZonedDateTime.subtract() preserves local time across DST transitions,
 * ensuring bookings execute at the correct wall-clock time even when crossing
 * spring-forward or fall-back dates.
 *
 * @param eventISOString - Event start time in ISO 8601 format (from ShaggyOwl API)
 * @returns Date object representing when booking should execute (7 days before event)
 *
 * @example
 * // Event at 2026-10-30T18:00:00+02:00 (CEST, before DST fall-back)
 * calculateBookingTime("2026-10-30T18:00:00+02:00")
 * // Returns Date for 2026-10-23T18:00:00+02:00 (still CEST, same local time)
 */
import { Temporal } from "@js-temporal/polyfill";

/**
 * Default advance scheduling minutes before the 7-day booking window opens.
 * Schedule slightly before to account for Inngest scheduling jitter and early booking window opening.
 */
export const DEFAULT_ADVANCE_MINUTES = 5;

export function calculateBookingTime(
  eventISOString: string,
  advanceMinutes: number = 0
): Date {

  // Parse event time in Europe/Rome timezone
  // Temporal.Instant represents an exact point in time (UTC)
  // toZonedDateTimeISO converts to local time in specified timezone
  const eventTime = Temporal.Instant.from(eventISOString)
    .toZonedDateTimeISO("Europe/Rome");

  // Subtract 7 days while preserving local time
  // If event is 18:00, booking will be 18:00 (even if DST changed in between)
  // Then subtract additional advance minutes for anticipatory scheduling
  const bookingTime = eventTime.subtract({ days: 7, minutes: advanceMinutes });

  // Convert to JavaScript Date for database storage
  // epochMilliseconds gives milliseconds since Unix epoch (UTC)
  return new Date(bookingTime.epochMilliseconds);
}

/**
 * Format booking time for display in Italian locale
 *
 * @param executeAt - Booking execution timestamp
 * @returns Human-readable string showing when booking will execute
 *
 * @example
 * formatBookingTime(new Date("2026-10-23T18:00:00+02:00"))
 * // Returns "23 ottobre 2026 alle 18:00"
 */
export function formatBookingTime(executeAt: Date): string {
  return new Intl.DateTimeFormat('it-IT', {
    timeZone: 'Europe/Rome',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(executeAt);
}

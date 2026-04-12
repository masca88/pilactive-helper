/**
 * Calculate booking execution time using Temporal API for DST-safe date arithmetic
 *
 * Given an event datetime, calculates when to execute the booking (configurable
 * minutes before at the same local time in Europe/Rome timezone).
 *
 * Advance time controlled by BOOKING_ADVANCE_MINUTES env var (defaults to 10080 = 7 days).
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
 * Configurable booking advance time in minutes.
 * Defaults to 10080 minutes (7 days) if not set.
 * In development, set to 2-3 minutes for fast testing.
 */
const BOOKING_ADVANCE_MINUTES = process.env.BOOKING_ADVANCE_MINUTES
  ? parseInt(process.env.BOOKING_ADVANCE_MINUTES, 10)
  : 10080; // 7 days default

/**
 * Default advance scheduling seconds before the 7-day booking window opens.
 * Schedule 3 seconds before to account for minimal Inngest scheduling jitter.
 */
export const DEFAULT_ADVANCE_SECONDS = 3;

export function calculateBookingTime(
  eventISOString: string,
  advanceSeconds: number = 0
): Date {

  // Parse event time in Europe/Rome timezone
  // Temporal.Instant represents an exact point in time (UTC)
  // toZonedDateTimeISO converts to local time in specified timezone
  const eventTime = Temporal.Instant.from(eventISOString)
    .toZonedDateTimeISO("Europe/Rome");

  // Subtract configured minutes while preserving local time
  // If event is 18:00, booking will be 18:00 (even if DST changed in between)
  // Then subtract additional advance seconds for anticipatory scheduling
  const bookingTime = eventTime.subtract({ minutes: BOOKING_ADVANCE_MINUTES, seconds: advanceSeconds });

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

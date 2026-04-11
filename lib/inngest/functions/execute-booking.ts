import { inngest } from "@/lib/inngest/client";
import { db } from "@/lib/db";
import { scheduledBookings } from "@/lib/db/schema";
import { refreshSessionToken } from "@/lib/api/shaggyowl/auth";
import { bookEvent } from "@/lib/api/shaggyowl/events";
import { eq } from "drizzle-orm";

const MAX_RETRY_ATTEMPTS = 10;
// Rapid retry interval for booking window opening detection (1 second × 10 attempts = 10s fallback window)
const RETRY_INTERVAL_SECONDS = 1;

/**
 * Check if error indicates booking window not yet open
 * Common ShaggyOwl API messages when trying to book too early
 */
function isBookingWindowNotOpen(errorMessage: string): boolean {
  const notOpenPatterns = [
    /non disponibile/i,
    /non prenotabile/i,
    /troppo presto/i,
    /non ancora aper/i,
    /prenotazioni chiuse/i,
    /finestra di prenotazione/i,
  ];

  return notOpenPatterns.some(pattern => pattern.test(errorMessage));
}

export const executeBooking = inngest.createFunction(
  {
    id: "execute-scheduled-booking",
    cancelOn: [
      {
        event: "booking/cancelled",
        if: "async.data.bookingId == event.data.bookingId",
      },
    ],
    triggers: [{ event: "booking/scheduled" }],
  },
  async ({ event, step }: { event: any; step: any }) => {
    const { bookingId, userId, eventId, eventDate, executeAt } = event.data;

    // Step 1: Update status to executing
    await step.run("update-status-executing", async () => {
      await db
        .update(scheduledBookings)
        .set({ status: "executing", updatedAt: new Date() })
        .where(eq(scheduledBookings.id, bookingId));

      return { updated: true };
    });

    // Step 2: Check if we need to wait for booking window
    // (handles anticipatory scheduling - wait until 7-day mark before attempting)
    const windowCheck = await step.run("check-booking-window", async () => {
      const executeTime = new Date(executeAt).getTime();
      const now = Date.now();
      return { executeTime, now, shouldWait: executeTime > now };
    });

    if (windowCheck.shouldWait) {
      const waitMs = windowCheck.executeTime - windowCheck.now;
      console.log(`[executeBooking ${bookingId}] Waiting ${waitMs}ms for booking window`);
      await step.sleep("wait-for-window", waitMs);
    }

    // Step 3: Refresh session token (AUTH-02 requirement)
    const sessionToken = await step.run("refresh-session", async () => {
      return await refreshSessionToken(userId);
    });

    // Step 4: Execute booking with retry logic
    let result: { success: boolean; bookingId: string | null; message?: string; error?: string; reason?: string } = {
      success: false,
      bookingId: null,
      error: "Not attempted",
    };

    for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
      console.log(`[executeBooking ${bookingId}] Attempt ${attempt}/${MAX_RETRY_ATTEMPTS}`);

      result = await step.run(`book-event-attempt-${attempt}`, async () => {
        // Check if booking was cancelled during execution
        const current = await db.query.scheduledBookings.findFirst({
          where: eq(scheduledBookings.id, bookingId),
        });

        if (current?.status === "cancelled") {
          return { success: false, reason: "cancelled", bookingId: null };
        }

        try {
          const booking = await bookEvent({
            eventId,
            eventDate,
            sessionToken,
            userId,
          });
          console.log(`[executeBooking ${bookingId}] Success on attempt ${attempt}`);
          return { success: true, bookingId: booking.id, message: booking.message };
        } catch (error: any) {
          console.log(`[executeBooking ${bookingId}] Error on attempt ${attempt}: ${error.message}`);
          return { success: false, error: error.message, bookingId: null };
        }
      });

      // If successful or cancelled, break out of retry loop
      if (result.success || result.reason === "cancelled") {
        break;
      }

      // If error indicates booking window not open, retry after delay
      if (result.error && isBookingWindowNotOpen(result.error)) {
        console.log(`[executeBooking ${bookingId}] Booking window not open yet, will retry in ${RETRY_INTERVAL_SECONDS}s`);

        // If this isn't the last attempt, wait before retrying
        if (attempt < MAX_RETRY_ATTEMPTS) {
          await step.sleep(`wait-retry-${attempt}`, `${RETRY_INTERVAL_SECONDS}s`);
        }
      } else {
        // Other errors (auth failure, network error, etc.) should not retry
        console.log(`[executeBooking ${bookingId}] Non-retryable error: ${result.error}`);
        break;
      }
    }

    // Step 5: Update final status
    await step.run("update-final-status", async () => {
      await db
        .update(scheduledBookings)
        .set({
          status: result.success ? "success" : "failed",
          bookedEventId: result.bookingId ?? undefined,
          errorMessage: result.error ?? result.reason ?? undefined,
          updatedAt: new Date(),
        })
        .where(eq(scheduledBookings.id, bookingId));

      return { status: result.success ? "success" : "failed" };
    });

    return result;
  }
);

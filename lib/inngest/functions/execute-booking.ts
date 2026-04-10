import { inngest } from "@/lib/inngest/client";
import { db } from "@/lib/db";
import { scheduledBookings } from "@/lib/db/schema";
import { refreshSessionToken } from "@/lib/api/shaggyowl/auth";
import { bookEvent } from "@/lib/api/shaggyowl/events";
import { eq } from "drizzle-orm";

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
    const { bookingId, userId, eventId, eventDate } = event.data;

    // Step 1: Update status to executing
    await step.run("update-status-executing", async () => {
      await db
        .update(scheduledBookings)
        .set({ status: "executing", updatedAt: new Date() })
        .where(eq(scheduledBookings.id, bookingId));

      return { updated: true };
    });

    // Step 2: Refresh session token (AUTH-02 requirement)
    const sessionToken = await step.run("refresh-session", async () => {
      return await refreshSessionToken(userId);
    });

    // Step 3: Execute booking
    const result = await step.run("book-event", async () => {
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
        return { success: true, bookingId: booking.id, message: booking.message };
      } catch (error: any) {
        return { success: false, error: error.message, bookingId: null };
      }
    });

    // Step 4: Update final status
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

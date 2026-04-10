"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { scheduledBookings } from "@/lib/db/schema";
import { inngest } from "@/lib/inngest/client";
import { calculateBookingTime } from "@/lib/utils/booking-calculator";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// Validation schema
const ScheduleBookingSchema = z.object({
  eventId: z.string().min(1, "Event ID required"),
  eventName: z.string().min(1, "Event name required"),
  eventStartTime: z.string().datetime("Invalid datetime format"),
  eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"), // YYYY-MM-DD
  eventInstructor: z.string().optional(),
});

/**
 * Schedule automatic booking for an event
 *
 * Calculates execution timestamp (7 days before event), sends Inngest event
 * with scheduled timestamp, and stores booking record in database.
 *
 * @param formData - Form data with event details
 * @returns Success/error result with execution timestamp
 */
export async function scheduleBooking(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Non autenticato" };
  }

  // Parse and validate input
  const parsed = ScheduleBookingSchema.safeParse({
    eventId: formData.get("eventId"),
    eventName: formData.get("eventName"),
    eventStartTime: formData.get("eventStartTime"),
    eventDate: formData.get("eventDate"),
    eventInstructor: formData.get("eventInstructor"),
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  }

  const { eventId, eventName, eventStartTime, eventDate, eventInstructor } = parsed.data;

  try {
    // Calculate executeAt: 7 days before event at same local time
    const executeAt = calculateBookingTime(eventStartTime);

    // Verify executeAt is in the future
    if (executeAt.getTime() <= Date.now()) {
      return { success: false, error: "L'evento è troppo vicino per essere prenotato automaticamente" };
    }

    // Generate booking ID upfront (needed for Inngest event and database)
    const bookingId = crypto.randomUUID();

    // Send Inngest event (does NOT execute immediately, waits until ts)
    const { ids } = await inngest.send({
      name: "booking/scheduled",
      data: {
        bookingId,
        userId: session.user.id,
        eventId,
        eventName,
        eventStartTime,
        eventDate, // YYYY-MM-DD format for bookEvent API call
        eventInstructor: eventInstructor ?? null,
      },
      ts: executeAt.getTime(), // Milliseconds since epoch
    });

    // Store in database (status: pending)
    await db.insert(scheduledBookings).values({
      id: bookingId,
      userId: session.user.id,
      eventId,
      eventName,
      eventStartTime: new Date(eventStartTime),
      eventInstructor: eventInstructor ?? null,
      executeAt,
      inngestRunId: ids[0], // Store for cancellation
      status: "pending",
    });

    revalidatePath("/bookings");
    revalidatePath("/events");

    return { success: true, executeAt: executeAt.toISOString() };
  } catch (error: any) {
    console.error("Error scheduling booking:", error);
    return { success: false, error: error.message ?? "Errore durante la pianificazione" };
  }
}

/**
 * Cancel scheduled booking before execution
 *
 * Sends cancellation event to Inngest and updates database status.
 * Can only cancel pending bookings (not executing/success/failed).
 *
 * @param bookingId - UUID of scheduled booking to cancel
 * @returns Success/error result
 */
export async function cancelScheduledBooking(bookingId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Non autenticato" };
  }

  try {
    // Fetch booking and verify ownership
    const booking = await db.query.scheduledBookings.findFirst({
      where: and(
        eq(scheduledBookings.id, bookingId),
        eq(scheduledBookings.userId, session.user.id)
      ),
    });

    if (!booking) {
      return { success: false, error: "Prenotazione non trovata" };
    }

    if (booking.status !== "pending") {
      return { success: false, error: "Impossibile cancellare: prenotazione già eseguita o cancellata" };
    }

    // Send cancellation event (triggers cancelOn in Inngest function)
    await inngest.send({
      name: "booking/cancelled",
      data: { bookingId },
    });

    // Update database
    await db
      .update(scheduledBookings)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(eq(scheduledBookings.id, bookingId));

    revalidatePath("/bookings");

    return { success: true };
  } catch (error: any) {
    console.error("Error cancelling booking:", error);
    return { success: false, error: error.message ?? "Errore durante la cancellazione" };
  }
}

/**
 * Fetch all scheduled bookings for current user
 *
 * Returns bookings sorted by executeAt (soonest first), with all metadata
 * for display in UI (status, timestamps, event details).
 *
 * @returns Array of scheduled bookings
 */
export async function getScheduledBookings() {
  const session = await auth();
  if (!session?.user?.id) {
    return [];
  }

  const bookings = await db.query.scheduledBookings.findMany({
    where: eq(scheduledBookings.userId, session.user.id),
    orderBy: (bookings, { asc }) => [asc(bookings.executeAt)],
  });

  return bookings;
}

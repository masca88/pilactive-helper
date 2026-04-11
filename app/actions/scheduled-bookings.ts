"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { scheduledBookings } from "@/lib/db/schema";
import { inngest } from "@/lib/inngest/client";
import { calculateBookingTime } from "@/lib/utils/booking-calculator";
import { eq, and, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// Validation schema
const ScheduleBookingSchema = z.object({
  eventId: z.string().min(1, "Event ID required"),
  eventName: z.string().min(1, "Event name required"),
  // Accept ISO 8601 datetime with timezone offset (e.g., 2026-04-14T13:00:00+01:00)
  eventStartTime: z.string().regex(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/,
    "Invalid datetime format"
  ),
  eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"), // YYYY-MM-DD
  eventInstructor: z.string().nullable().optional(),
  eventImageUrl: z.string().nullable().optional(),
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
  const rawData = {
    eventId: formData.get("eventId"),
    eventName: formData.get("eventName"),
    eventStartTime: formData.get("eventStartTime"),
    eventDate: formData.get("eventDate"),
    eventInstructor: formData.get("eventInstructor"),
    eventImageUrl: formData.get("eventImageUrl"),
  };

  console.log("[scheduleBooking] Raw data:", rawData);

  const parsed = ScheduleBookingSchema.safeParse(rawData);

  if (!parsed.success) {
    console.error("[scheduleBooking] Validation error:", parsed.error.issues);
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  }

  const { eventId, eventName, eventStartTime, eventDate, eventInstructor, eventImageUrl } = parsed.data;

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
      eventImageUrl: eventImageUrl ?? null,
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

    // Cannot cancel successfully completed bookings
    if (booking.status === "success") {
      return { success: false, error: "Impossibile cancellare: prenotazione già completata con successo" };
    }

    // For pending bookings, send cancellation event to Inngest
    if (booking.status === "pending") {
      await inngest.send({
        name: "booking/cancelled",
        data: { bookingId },
      });
    }

    // Update database (or delete for already cancelled/failed)
    if (booking.status === "pending" || booking.status === "executing") {
      await db
        .update(scheduledBookings)
        .set({ status: "cancelled", updatedAt: new Date() })
        .where(eq(scheduledBookings.id, bookingId));
    } else {
      // For already cancelled/failed, just delete from database
      await db
        .delete(scheduledBookings)
        .where(eq(scheduledBookings.id, bookingId));
    }

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
 * Excludes cancelled bookings from the list.
 *
 * @returns Array of scheduled bookings
 */
export async function getScheduledBookings() {
  const session = await auth();
  if (!session?.user?.id) {
    return [];
  }

  const bookings = await db.query.scheduledBookings.findMany({
    where: and(
      eq(scheduledBookings.userId, session.user.id),
      // Exclude cancelled bookings from the list
      // (show pending, executing, success, failed)
      // @ts-ignore - Drizzle typing issue with not equal
      sql`${scheduledBookings.status} != 'cancelled'`
    ),
    orderBy: (bookings, { asc }) => [asc(bookings.executeAt)],
  });

  return bookings;
}

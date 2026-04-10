import { pgTable, uuid, text, timestamp, pgEnum } from 'drizzle-orm/pg-core';
import { users } from './users';

export const bookingStatusEnum = pgEnum('booking_status', [
  'pending',    // Scheduled, waiting for execution
  'executing',  // Currently running
  'success',    // Booking completed successfully
  'failed',     // Booking failed (will not retry in Phase 3)
  'cancelled'   // User cancelled before execution
]);

export const scheduledBookings = pgTable('scheduled_bookings', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),

  // Event details (denormalized for display)
  eventId: text('event_id').notNull(), // ShaggyOwl event ID
  eventName: text('event_name').notNull(),
  eventStartTime: timestamp('event_start_time', { mode: 'date' }).notNull(),
  eventInstructor: text('event_instructor'),

  // Scheduling metadata
  executeAt: timestamp('execute_at', { mode: 'date' }).notNull(), // When to book (7 days before)
  inngestRunId: text('inngest_run_id'), // For cancellation tracking

  // Status tracking
  status: bookingStatusEnum('status').default('pending').notNull(),
  errorMessage: text('error_message'), // If failed
  bookedEventId: text('booked_event_id'), // ShaggyOwl booking confirmation ID

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

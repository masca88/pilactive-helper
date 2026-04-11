---
phase: 03-automated-scheduling-engine
reviewed: 2026-04-11T10:30:00Z
depth: standard
files_reviewed: 15
files_reviewed_list:
  - lib/db/schema/scheduled-bookings.ts
  - lib/db/schema/index.ts
  - lib/inngest/client.ts
  - lib/utils/booking-calculator.ts
  - app/api/inngest/route.ts
  - lib/inngest/functions/execute-booking.ts
  - lib/api/shaggyowl/auth.ts
  - lib/api/shaggyowl/events.ts
  - lib/api/shaggyowl/types.ts
  - package.json
  - app/actions/scheduled-bookings.ts
  - app/(dashboard)/events/_components/event-card.tsx
  - app/(dashboard)/bookings/page.tsx
  - app/(dashboard)/bookings/_components/scheduled-bookings-list.tsx
  - app/(dashboard)/layout.tsx
findings:
  critical: 2
  warning: 5
  info: 4
  total: 11
status: issues_found
---

# Phase 03: Code Review Report

**Reviewed:** 2026-04-11T10:30:00Z
**Depth:** standard
**Files Reviewed:** 15
**Status:** issues_found

## Summary

Reviewed the automated scheduling engine implementation including database schema, Inngest job orchestration, booking calculation logic, and UI components. The implementation follows the recommended stack (Inngest, Temporal API, Drizzle ORM) and demonstrates good structure overall.

**Key concerns:**

1. **Critical Security Issue**: Passwords stored in plaintext in database (acknowledged as TODO for Phase 4, but represents active security vulnerability)
2. **Critical Bug**: Hardcoded timezone offset in event-card.tsx creates incorrect scheduling times for events during DST transitions
3. **Multiple error handling gaps**: Missing null checks, uncaught promise rejections, and potential race conditions
4. **Type safety issues**: Excessive use of `any` types bypasses TypeScript safety in critical booking logic

## Critical Issues

### CR-01: Hardcoded Timezone Offset Breaks DST Handling

**File:** `app/(dashboard)/events/_components/event-card.tsx:33`
**Issue:** The timezone offset is hardcoded as `+01:00` when constructing the ISO datetime string for event scheduling. This creates incorrect booking times during daylight saving time (DST) periods. When events occur during CEST (UTC+2, summer time), the hardcoded `+01:00` will cause bookings to be scheduled 1 hour late.

```typescript
// BROKEN: Hardcoded offset doesn't account for DST
formData.append("eventStartTime", `${event.data}T${event.oraInizio}:00+01:00`);
```

**Fix:** Use the Temporal API to construct the ISO string with the correct timezone offset for Europe/Rome:

```typescript
import { Temporal } from "@js-temporal/polyfill";

// Construct datetime in Europe/Rome timezone
const eventDateTime = Temporal.ZonedDateTime.from({
  year: parseInt(event.data.split('-')[0]),
  month: parseInt(event.data.split('-')[1]),
  day: parseInt(event.data.split('-')[2]),
  hour: parseInt(event.oraInizio.split(':')[0]),
  minute: parseInt(event.oraInizio.split(':')[1]),
  second: 0,
  timeZone: 'Europe/Rome',
});

formData.append("eventStartTime", eventDateTime.toString());
```

Alternatively, if the ShaggyOwl API provides ISO timestamps with correct offsets, use that directly instead of reconstructing from date + time strings.

### CR-02: Plaintext Password Storage in Database

**File:** `lib/api/shaggyowl/auth.ts:121,134`
**Issue:** User passwords for PilActive accounts are stored in plaintext in the `credentials` table. While marked as "TODO: Encrypt in Phase 4", this represents an active security vulnerability. If the database is compromised, all user gym account credentials are immediately exposed.

**Fix:** Implement encryption immediately before production deployment. Use AES-256-GCM encryption with a key stored in environment variables (not in database):

```typescript
import { randomBytes, createCipheriv, createDecipheriv } from 'crypto';

const ENCRYPTION_KEY = Buffer.from(process.env.CREDENTIAL_ENCRYPTION_KEY!, 'hex'); // 32 bytes for AES-256

function encryptPassword(password: string): { encrypted: string; iv: string } {
  const iv = randomBytes(16);
  const cipher = createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
  const encrypted = Buffer.concat([
    cipher.update(password, 'utf8'),
    cipher.final(),
    cipher.getAuthTag(),
  ]);
  return {
    encrypted: encrypted.toString('base64'),
    iv: iv.toString('base64'),
  };
}

function decryptPassword(encrypted: string, iv: string): string {
  const encryptedBuffer = Buffer.from(encrypted, 'base64');
  const ivBuffer = Buffer.from(iv, 'base64');
  const authTag = encryptedBuffer.slice(-16);
  const ciphertext = encryptedBuffer.slice(0, -16);
  
  const decipher = createDecipheriv('aes-256-gcm', ENCRYPTION_KEY, ivBuffer);
  decipher.setAuthTag(authTag);
  
  return Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString('utf8');
}
```

Store the `iv` (initialization vector) in a separate column in the credentials table. Never log or expose encrypted passwords or the encryption key.

## Warnings

### WR-01: Type Safety Bypassed with `any` in Inngest Function

**File:** `lib/inngest/functions/execute-booking.ts:19,56`
**Issue:** The Inngest function parameters `event` and `step` are typed as `any`, bypassing TypeScript's type safety. This means typos in property access (e.g., `event.datta` instead of `event.data`) won't be caught at compile time, and invalid data shapes can reach booking logic.

**Fix:** Define proper TypeScript interfaces for the Inngest event and step parameters:

```typescript
import { InngestFunction } from "inngest";

interface BookingScheduledEvent {
  name: "booking/scheduled";
  data: {
    bookingId: string;
    userId: string;
    eventId: string;
    eventDate: string;
    eventName: string;
    eventStartTime: string;
    eventInstructor: string | null;
  };
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
  async ({ event, step }: { event: BookingScheduledEvent; step: any }) => {
    // Now event.data.bookingId is type-safe
    const { bookingId, userId, eventId, eventDate } = event.data;
    // ...
  }
);
```

Note: `step` type depends on Inngest SDK exports. Check `inngest` package exports for proper `Step` type.

### WR-02: Missing Error Handling for Inngest Send Failures

**File:** `app/actions/scheduled-bookings.ts:73,143`
**Issue:** The `inngest.send()` calls in both `scheduleBooking` and `cancelScheduledBooking` are awaited but don't have explicit error handling. If Inngest is unavailable or returns an error, the database record will be created/updated but the job won't be scheduled/cancelled, creating inconsistent state.

**Fix:** Wrap Inngest calls in try-catch and rollback database changes on failure:

```typescript
try {
  // Send Inngest event (does NOT execute immediately, waits until ts)
  const { ids } = await inngest.send({
    name: "booking/scheduled",
    data: {
      bookingId,
      userId: session.user.id,
      eventId,
      eventName,
      eventStartTime,
      eventDate,
      eventInstructor: eventInstructor ?? null,
    },
    ts: executeAt.getTime(),
  });

  // Store in database (status: pending) AFTER successful Inngest send
  await db.insert(scheduledBookings).values({
    id: bookingId,
    userId: session.user.id,
    eventId,
    eventName,
    eventStartTime: new Date(eventStartTime),
    eventInstructor: eventInstructor ?? null,
    executeAt,
    inngestRunId: ids[0],
    status: "pending",
  });
} catch (error: any) {
  console.error("Error scheduling booking:", error);
  return { success: false, error: "Impossibile pianificare la prenotazione. Riprova." };
}
```

Alternatively, use database transactions to ensure atomicity.

### WR-03: Race Condition in Booking Cancellation Check

**File:** `lib/inngest/functions/execute-booking.ts:40-46`
**Issue:** The cancellation check inside the `book-event` step creates a race condition. If a user clicks cancel between the check (line 40) and the API call (line 49), the booking will execute anyway. The Inngest `cancelOn` configuration should prevent this, but the manual check suggests uncertainty about cancellation guarantees.

**Fix:** If Inngest's `cancelOn` is reliable (per documentation, it should be), remove the redundant manual check and let Inngest handle cancellation. If additional safety is needed, move the check to BEFORE the step runs:

```typescript
// Before Step 3, check if cancelled
const currentStatus = await db.query.scheduledBookings.findFirst({
  where: eq(scheduledBookings.id, bookingId),
  columns: { status: true },
});

if (currentStatus?.status === "cancelled") {
  return { success: false, reason: "cancelled", bookingId: null };
}

// Step 3: Execute booking (without redundant check inside)
const result = await step.run("book-event", async () => {
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
```

### WR-04: Insufficient Validation of Event Date Format

**File:** `app/actions/scheduled-bookings.ts:21`
**Issue:** The `eventDate` field is validated with a regex for `YYYY-MM-DD` format, but the regex doesn't check for valid date values (e.g., `2026-02-31` would pass validation but is an invalid date). Additionally, there's no check that the event date is in the future.

**Fix:** Use Zod's built-in date coercion and custom refinement:

```typescript
const ScheduleBookingSchema = z.object({
  eventId: z.string().min(1, "Event ID required"),
  eventName: z.string().min(1, "Event name required"),
  eventStartTime: z.string().regex(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/,
    "Invalid datetime format"
  ),
  eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format")
    .refine((date) => {
      const parsed = new Date(date);
      return !isNaN(parsed.getTime()) && date === parsed.toISOString().split('T')[0];
    }, "Invalid date value")
    .refine((date) => {
      const parsed = new Date(date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return parsed >= today;
    }, "Event date must be in the future"),
  eventInstructor: z.string().optional(),
});
```

### WR-05: Missing Null Check for Session Token in Events API

**File:** `lib/api/shaggyowl/events.ts:50-52`
**Issue:** The code throws a generic error if `sessionToken` is missing, but doesn't distinguish between "user has no credentials at all" vs "session token exists but is null/undefined". This makes debugging harder and provides poor UX (the error message directs users to settings, but doesn't indicate whether they need to connect their account for the first time or re-authenticate).

**Fix:** Check both cases explicitly:

```typescript
if (!userCreds) {
  throw new Error('Account PilActive non collegato. Vai su Impostazioni per collegare il tuo account.');
}

if (!userCreds.sessionToken) {
  throw new Error('Session token scaduto. Vai su Impostazioni per ricollegare il tuo account PilActive.');
}
```

## Info

### IN-01: Debugging console.log in Production Code

**File:** `app/actions/scheduled-bookings.ts:49,54`
**Issue:** Two `console.log` statements remain in production code. While useful during development, these log sensitive user input to server logs and should be removed or gated behind a debug flag before production deployment.

**Fix:** Remove the logs or gate them:

```typescript
if (process.env.NODE_ENV === 'development') {
  console.log("[scheduleBooking] Raw data:", rawData);
  console.log("[scheduleBooking] Validation error:", parsed.error.issues);
}
```

Better: Use a proper logging library (e.g., `pino`, `winston`) with structured logging and environment-based log levels.

### IN-02: Unused Import in Database Schema Index

**File:** `lib/db/schema/index.ts`
**Issue:** The file exports all schemas but doesn't actually import or use anything itself. While this pattern works (re-exporting from other files), it's a barrel export that can slow down build times and tree-shaking in large projects.

**Fix:** No immediate action required (this is standard practice for schema index files), but monitor if the project grows large. Consider splitting into feature-specific barrels if the schema count exceeds 10-15 tables.

### IN-03: Hard Refresh Instead of Optimistic Update

**File:** `app/(dashboard)/bookings/_components/scheduled-bookings-list.tsx:34`
**Issue:** The cancellation success handler uses `window.location.reload()`, which triggers a full page refresh and loses scroll position. This creates poor UX compared to optimistic updates or Next.js cache revalidation.

**Fix:** Use Next.js router refresh for better UX:

```typescript
import { useRouter } from 'next/navigation';

export function ScheduledBookingsList({ bookings }: { bookings: ScheduledBooking[] }) {
  const router = useRouter();
  const [cancelling, setCancelling] = useState<string | null>(null);

  async function handleCancel(bookingId: string) {
    if (!confirm('Sei sicuro di voler cancellare questa prenotazione automatica?')) {
      return;
    }

    setCancelling(bookingId);
    const result = await cancelScheduledBooking(bookingId);

    if (result.success) {
      router.refresh(); // Uses Next.js cache instead of full reload
    } else {
      alert(result.error);
    }

    setCancelling(null);
  }
  // ...
}
```

Note: The Server Action already calls `revalidatePath('/bookings')` at line 154 of `scheduled-bookings.ts`, so `router.refresh()` should pick up the updated data.

### IN-04: Alert() Usage for User Feedback

**File:** `app/(dashboard)/events/_components/event-card.tsx:43` and `app/(dashboard)/bookings/_components/scheduled-bookings-list.tsx:36`
**Issue:** The code uses native `alert()` for user feedback, which blocks the UI thread and provides poor UX. The project has `sonner` installed (per CLAUDE.md recommendation for toast notifications), but it's not used.

**Fix:** Replace alerts with toast notifications using Sonner:

```typescript
import { toast } from 'sonner';

// In event-card.tsx
if (result.success) {
  toast.success('Prenotazione programmata!', {
    description: `Esecuzione: ${new Date(result.executeAt!).toLocaleString('it-IT', { 
      timeZone: 'Europe/Rome' 
    })}`
  });
} else {
  toast.error('Errore', { description: result.error });
}

// In scheduled-bookings-list.tsx
if (!result.success) {
  toast.error('Errore durante la cancellazione', { description: result.error });
}
```

Make sure to add `<Toaster />` component to the layout (recommended in shadcn/ui Sonner integration guide).

---

_Reviewed: 2026-04-11T10:30:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_

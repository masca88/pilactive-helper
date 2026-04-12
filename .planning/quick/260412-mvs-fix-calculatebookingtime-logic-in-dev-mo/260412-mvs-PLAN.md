---
phase: quick
plan: 260412-mvs
type: execute
wave: 1
depends_on: []
files_modified:
  - lib/utils/booking-calculator.ts
autonomous: false
requirements: []

must_haves:
  truths:
    - "In dev mode (BOOKING_ADVANCE_MINUTES < 1440), booking schedules X minutes from NOW"
    - "In production mode (BOOKING_ADVANCE_MINUTES >= 1440), booking schedules X minutes before event time"
    - "Fast testing enabled: set BOOKING_ADVANCE_MINUTES=2, booking executes in 2 minutes regardless of event date"
  artifacts:
    - path: "lib/utils/booking-calculator.ts"
      provides: "Conditional dev/prod scheduling logic"
      contains: "BOOKING_ADVANCE_MINUTES < DEV_MODE_THRESHOLD_MINUTES"
  key_links:
    - from: "lib/utils/booking-calculator.ts"
      to: "Temporal.Now.zonedDateTimeISO"
      via: "Dev mode branch schedules from current time"
      pattern: "Temporal\\.Now\\.zonedDateTimeISO"
---

# Quick Task: Fix calculateBookingTime Logic for Dev Mode

<objective>
Fix calculateBookingTime to schedule bookings X minutes from NOW (not from event time) when in dev mode (BOOKING_ADVANCE_MINUTES < 1440).

**Purpose:** Enable fast testing by scheduling execution relative to current time instead of event time when using short advance intervals.

**Output:** Modified booking-calculator.ts with conditional logic based on BOOKING_ADVANCE_MINUTES value.
</objective>

<execution_context>
@/Users/mscaltrini/Dev/masca88/pilactive-helper/.claude/get-shit-done/workflows/execute-quick.md
@/Users/mscaltrini/Dev/masca88/pilactive-helper/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@/Users/mscaltrini/Dev/masca88/pilactive-helper/.planning/STATE.md

## Current Bug

From `lib/utils/booking-calculator.ts` (lines 38-56):

```typescript
export function calculateBookingTime(
  eventISOString: string,
  advanceSeconds: number = 0
): Date {
  const eventTime = Temporal.Instant.from(eventISOString)
    .toZonedDateTimeISO("Europe/Rome");

  // Subtract configured minutes while preserving local time
  const bookingTime = eventTime.subtract({ minutes: BOOKING_ADVANCE_MINUTES, seconds: advanceSeconds });

  return new Date(bookingTime.epochMilliseconds);
}
```

**Problem:** With BOOKING_ADVANCE_MINUTES=2, function calculates "event time minus 2 minutes". For a future event 5 days away, booking still schedules 5 days away. This defeats fast testing.

**Example of current (broken) behavior:**
- Event: April 17, 2026 at 18:00
- Current time: April 12, 2026 at 10:00
- BOOKING_ADVANCE_MINUTES=2
- Expected: Schedule for April 12 at 10:02 (2 minutes from NOW)
- **Actual: Schedule for April 17 at 17:58 (2 minutes before event)** ❌

## Required Behavior

**Dev mode (BOOKING_ADVANCE_MINUTES < 1440 = 1 day):**
- Schedule X minutes FROM NOW
- Temporal.Now.instant() + X minutes
- Enables fast testing: set to 2 minutes, booking executes in 2 minutes

**Production mode (BOOKING_ADVANCE_MINUTES >= 1440):**
- Existing logic unchanged
- Event time - X minutes
- Production default: 10080 minutes (7 days)

## Why This Matters

**Current testing workflow (broken):**
1. Set BOOKING_ADVANCE_MINUTES=2
2. Schedule event 5 days in future
3. Booking schedules 5 days from now (event time - 2 min)
4. Can't test within minutes

**With fix (working):**
1. Set BOOKING_ADVANCE_MINUTES=2
2. Schedule ANY future event (doesn't matter how far)
3. Booking executes in 2 minutes (now + 2 min)
4. Fast feedback loop for development
</context>

<tasks>

<task type="auto">
  <name>Task 1: Update calculateBookingTime with conditional dev/prod logic</name>
  <files>lib/utils/booking-calculator.ts</files>
  <action>
Modify calculateBookingTime function to detect dev mode and use different calculation:

**1. Add constant after BOOKING_ADVANCE_MINUTES definition (around line 31):**

```typescript
/**
 * Threshold to distinguish dev mode (fast testing) from production mode.
 * If BOOKING_ADVANCE_MINUTES < 1440 (1 day), treat as dev mode and schedule from NOW.
 * If BOOKING_ADVANCE_MINUTES >= 1440, use production logic (schedule before event time).
 */
const DEV_MODE_THRESHOLD_MINUTES = 1440; // 1 day
```

**2. Replace the booking time calculation (lines 49-52) with conditional logic:**

FROM:
```typescript
  // Subtract configured minutes while preserving local time
  // If event is 18:00, booking will be 18:00 (even if DST changed in between)
  // Then subtract additional advance seconds for anticipatory scheduling
  const bookingTime = eventTime.subtract({ minutes: BOOKING_ADVANCE_MINUTES, seconds: advanceSeconds });
```

TO:
```typescript
  // Dev mode: schedule X minutes from NOW (for fast testing)
  // Prod mode: schedule X minutes before EVENT time (production behavior)
  const bookingTime = BOOKING_ADVANCE_MINUTES < DEV_MODE_THRESHOLD_MINUTES
    ? Temporal.Now.zonedDateTimeISO("Europe/Rome")
        .add({ minutes: BOOKING_ADVANCE_MINUTES })
        .subtract({ seconds: advanceSeconds })
    : eventTime.subtract({ minutes: BOOKING_ADVANCE_MINUTES, seconds: advanceSeconds });
```

**3. Update function JSDoc comment (lines 3-19) to document dev mode:**

Add after line 7 (after "Advance time controlled by..." line):

```
 * In dev mode (BOOKING_ADVANCE_MINUTES < 1440), schedules X minutes from NOW instead
 * of X minutes before the event. This enables fast testing regardless of event date.
```

Update @example section to show both modes:

```typescript
 * @example
 * // Production mode (BOOKING_ADVANCE_MINUTES >= 1440)
 * // Event at 2026-10-30T18:00:00+02:00 (CEST, before DST fall-back)
 * calculateBookingTime("2026-10-30T18:00:00+02:00")
 * // Returns Date for 2026-10-23T18:00:00+02:00 (7 days before event, same local time)
 *
 * @example
 * // Dev mode (BOOKING_ADVANCE_MINUTES=2, current time 10:00)
 * calculateBookingTime("2026-10-30T18:00:00+02:00")
 * // Returns Date for current time + 2 minutes (e.g. 10:02), regardless of event date
```

**Why this approach:**
- Uses 1440 minutes (1 day) as threshold to distinguish testing from production
- Maintains timezone correctness with Temporal API in both modes
- No breaking changes to function signature or call sites
- Preserves existing production behavior exactly

**Do NOT:**
- Change the function signature or return type
- Modify any call sites in app/actions/scheduled-bookings.ts
- Remove or alter advanceSeconds parameter handling
- Change DEFAULT_ADVANCE_SECONDS constant
  </action>
  <verify>
    <automated>
grep -q "DEV_MODE_THRESHOLD_MINUTES = 1440" lib/utils/booking-calculator.ts && \
grep -q "Temporal.Now.zonedDateTimeISO" lib/utils/booking-calculator.ts && \
grep -q "BOOKING_ADVANCE_MINUTES < DEV_MODE_THRESHOLD_MINUTES" lib/utils/booking-calculator.ts && \
echo "PASSED: Dev mode logic implemented" || echo "FAILED: Missing dev mode code"
    </automated>
  </verify>
  <done>
- calculateBookingTime contains conditional logic checking BOOKING_ADVANCE_MINUTES < 1440
- Dev mode branch uses Temporal.Now.zonedDateTimeISO().add()
- Production mode branch preserves existing eventTime.subtract() logic
- Both branches handle advanceSeconds correctly
- Function JSDoc updated with dev mode documentation and examples
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Checkpoint: Verify dev and production mode scheduling behavior</name>
  <what-built>Updated calculateBookingTime with dev mode detection (BOOKING_ADVANCE_MINUTES < 1440 schedules from now)</what-built>
  <how-to-verify>
**Test 1: Dev mode (schedule from NOW)**

1. Set in `.env.local`:
   ```
   BOOKING_ADVANCE_MINUTES=2
   ```

2. Restart dev server: `npm run dev`

3. Go to http://localhost:3000/events

4. Schedule any future event (doesn't matter how far away - try an event 5 days from now)

5. Go to http://localhost:3000/bookings

6. Check the "Esecuzione programmata" column - should show ~2 minutes from NOW (current time + 2 min)
   - NOT 2 minutes before the event time
   - Should be close to current wall-clock time

7. Wait 2-3 minutes and check if Inngest executes (optional - confirms end-to-end flow)

**Test 2: Production mode (unchanged behavior)**

1. Set in `.env.local`:
   ```
   BOOKING_ADVANCE_MINUTES=10080
   ```

2. Restart dev server

3. Schedule an event that's 10+ days away (e.g., April 25 if today is April 12)

4. Go to /bookings

5. Verify executeAt is 7 days before event time (existing behavior)
   - For event on April 25 at 18:00, should show April 18 at 18:00
   - NOT current time + 7 days

**Expected results:**
- ✅ Dev mode (2 min): executeAt = NOW + 2 minutes
- ✅ Prod mode (10080 min): executeAt = event time - 7 days
- ✅ No TypeScript compilation errors
- ✅ No runtime errors in browser console
- ✅ Timezone shows Europe/Rome (IT time)

**Check browser console and terminal for any errors**
  </how-to-verify>
  <resume-signal>Type "approved" if both modes work correctly, or describe issues found</resume-signal>
</task>

</tasks>

<verification>
After execution, verify:

```bash
# Check constant added
grep "DEV_MODE_THRESHOLD_MINUTES = 1440" lib/utils/booking-calculator.ts

# Check conditional logic
grep "BOOKING_ADVANCE_MINUTES < DEV_MODE_THRESHOLD_MINUTES" lib/utils/booking-calculator.ts

# Check dev mode uses Temporal.Now
grep "Temporal.Now.zonedDateTimeISO" lib/utils/booking-calculator.ts

# Verify TypeScript compilation
npm run build --filter lib/utils/booking-calculator.ts
```

Should show:
- Constant DEV_MODE_THRESHOLD_MINUTES = 1440 defined
- Conditional ternary checking threshold
- Dev mode branch using Temporal.Now.zonedDateTimeISO("Europe/Rome").add()
- Production mode branch using eventTime.subtract()
- Zero TypeScript errors
</verification>

<success_criteria>
- [ ] DEV_MODE_THRESHOLD_MINUTES constant defined as 1440
- [ ] calculateBookingTime contains conditional logic for dev/prod modes
- [ ] Dev mode (< 1440 min): schedules from Temporal.Now + X minutes
- [ ] Production mode (>= 1440 min): schedules from event time - X minutes
- [ ] Function JSDoc updated with dev mode explanation and examples
- [ ] TypeScript compilation passes with zero errors
- [ ] Manual test: BOOKING_ADVANCE_MINUTES=2 schedules ~2 min from NOW
- [ ] Manual test: BOOKING_ADVANCE_MINUTES=10080 schedules 7 days before event
- [ ] No changes required to call sites (scheduled-bookings.ts unchanged)
- [ ] Developer can now test booking execution within minutes instead of days
</success_criteria>

<output>
After completion, create `.planning/quick/260412-mvs-fix-calculatebookingtime-logic-in-dev-mo/260412-mvs-SUMMARY.md`
</output>

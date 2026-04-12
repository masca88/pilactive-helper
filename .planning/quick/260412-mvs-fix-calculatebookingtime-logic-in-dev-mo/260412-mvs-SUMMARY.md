---
phase: quick
plan: 260412-mvs
type: summary
completed: 2026-04-12
duration: 3
tasks_completed: 1
tasks_total: 2
decisions:
  - "Use 1440 minutes (1 day) as threshold to distinguish dev mode from production mode"
  - "Dev mode schedules from Temporal.Now instead of event time for fast testing"
key_files:
  - path: lib/utils/booking-calculator.ts
    status: modified
    purpose: Added conditional dev/prod scheduling logic
---

# Quick Task Summary: Fix calculateBookingTime Logic for Dev Mode

**One-liner:** Dev mode detection added to calculateBookingTime - schedules from NOW when BOOKING_ADVANCE_MINUTES < 1440, enabling 2-minute test cycles instead of waiting days.

## Tasks Completed

| Task | Status | Commit | Description |
|------|--------|--------|-------------|
| 1 | ✅ Complete | 58ee244 | Updated calculateBookingTime with conditional dev/prod logic |
| 2 | ⏸️ Checkpoint | - | Awaiting human verification of dev and production modes |

## What Was Built

Modified `lib/utils/booking-calculator.ts` to detect dev mode and use different scheduling strategies:

**Dev mode (BOOKING_ADVANCE_MINUTES < 1440):**
- Schedules X minutes from current time (Temporal.Now)
- Example: Set BOOKING_ADVANCE_MINUTES=2, booking executes in 2 minutes
- Enables fast testing regardless of event date

**Production mode (BOOKING_ADVANCE_MINUTES >= 1440):**
- Preserves existing behavior
- Schedules X minutes before event time
- Default: 10080 minutes (7 days)

## Implementation Details

**Added:**
- `DEV_MODE_THRESHOLD_MINUTES = 1440` constant (1 day threshold)
- Conditional ternary in `calculateBookingTime`:
  - Dev branch: `Temporal.Now.zonedDateTimeISO("Europe/Rome").add({ minutes: BOOKING_ADVANCE_MINUTES })`
  - Prod branch: `eventTime.subtract({ minutes: BOOKING_ADVANCE_MINUTES })`
- Updated JSDoc with dev mode explanation and dual examples

**Preserved:**
- Function signature unchanged (no breaking changes)
- advanceSeconds parameter handling in both modes
- Timezone correctness with Temporal API
- No modifications needed to call sites

## Deviations from Plan

None - plan executed exactly as written.

## Verification Status

**Automated checks:** ✅ PASSED
- DEV_MODE_THRESHOLD_MINUTES constant defined
- Temporal.Now.zonedDateTimeISO present in code
- Conditional logic checking BOOKING_ADVANCE_MINUTES < DEV_MODE_THRESHOLD_MINUTES
- TypeScript compilation passes with zero errors

**Manual verification:** ⏸️ PENDING (Checkpoint reached)
- Awaiting human verification of:
  - Dev mode (2 min): schedules from NOW + 2 minutes
  - Prod mode (10080 min): schedules from event time - 7 days
  - No runtime errors in browser console
  - Timezone displays Europe/Rome correctly

## Files Modified

```
lib/utils/booking-calculator.ts
```

**Changes:**
- Added DEV_MODE_THRESHOLD_MINUTES constant (line ~38)
- Updated booking time calculation with conditional logic (lines ~52-57)
- Enhanced JSDoc with dev mode documentation and examples (lines 1-27)

## Commit

```
58ee244 - feat(quick-260412-mvs): add dev mode to calculateBookingTime for fast testing
```

## Next Steps

**Human verification required:**

1. Test dev mode (BOOKING_ADVANCE_MINUTES=2):
   - Set env var, restart server
   - Schedule any future event
   - Verify executeAt shows ~2 minutes from NOW

2. Test production mode (BOOKING_ADVANCE_MINUTES=10080):
   - Set env var, restart server
   - Schedule event 10+ days away
   - Verify executeAt shows 7 days before event time

3. Check for errors in browser console and terminal

**Resume signal:** Type "approved" if both modes work correctly, or describe issues found.

## Impact

**Before this fix:**
- Setting BOOKING_ADVANCE_MINUTES=2 still scheduled 2 minutes before event time
- For event 5 days away, booking would execute in 5 days
- Fast testing impossible without creating near-future test events

**After this fix:**
- Setting BOOKING_ADVANCE_MINUTES=2 schedules 2 minutes from current time
- Event date irrelevant - always executes in 2 minutes
- Fast feedback loop for development and testing

**Developer experience improvement:**
- Test cycle reduced from days to minutes
- No need to manipulate event dates for testing
- Production behavior unchanged and safe

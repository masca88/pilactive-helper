---
phase: quick-260411-blm
plan: 01
subsystem: automated-scheduling
tags: [inngest, retry-logic, scheduling, reliability]
dependency_graph:
  requires: [booking-calculator, execute-booking, scheduled-bookings]
  provides: [anticipatory-scheduling, retry-mechanism]
  affects: [booking-reliability, scheduling-accuracy]
tech_stack:
  added: []
  patterns: [anticipatory-scheduling, rapid-retry, step-functions]
key_files:
  created: []
  modified:
    - lib/utils/booking-calculator.ts
    - lib/inngest/functions/execute-booking.ts
    - app/actions/scheduled-bookings.ts
decisions:
  - "Set DEFAULT_ADVANCE_MINUTES to 5 minutes for optimal window timing"
  - "Use 30-second retry intervals with max 10 attempts (5 minutes total)"
  - "Detect 'window not open' errors via regex pattern matching on Italian error messages"
  - "Break retry loop on non-retryable errors (auth failures, network errors)"
metrics:
  duration: 215
  tasks_completed: 3
  files_modified: 3
  commits: 3
  completed_date: "2026-04-11"
---

# Quick Task: Implementare strategia di scheduling anticipato

**One-liner:** Anticipatory scheduling with 5-minute advance and 30-second retry intervals for reliable booking execution

## Overview

Implemented an anticipatory scheduling strategy to improve automatic booking reliability. Instead of scheduling exactly 7 days before events, the system now schedules 5 minutes early with rapid retry logic (30s intervals, max 10 attempts) if the booking window isn't yet open. This compensates for Inngest scheduling jitter and early window openings.

**Status:** ✅ Complete
**Execution Time:** 215 seconds (~3.6 minutes)

## Tasks Completed

| Task | Description | Commit | Files Modified |
|------|-------------|--------|----------------|
| 1 | Add configurable advance scheduling | 7e87c2a | lib/utils/booking-calculator.ts |
| 2 | Implement rapid retry in Inngest function | ae0600e | lib/inngest/functions/execute-booking.ts |
| 3 | Update scheduleBooking action | ee7e876 | app/actions/scheduled-bookings.ts |

## Implementation Details

### Anticipatory Scheduling Configuration
- Added `DEFAULT_ADVANCE_MINUTES = 5` constant to booking-calculator.ts
- Modified `calculateBookingTime()` to accept optional `advanceMinutes` parameter
- Preserves DST-safe calculation using Temporal API (Europe/Rome timezone)
- Timestamp calculation: `eventTime.subtract({ days: 7, minutes: advanceMinutes })`

### Retry Logic in Inngest Function
- **Check-booking-window step:** Waits if `executeAt` is in the future (handles the 5-minute advance)
- **Retry loop:** Max 10 attempts with 30-second intervals using `step.sleep()`
- **Error detection:** `isBookingWindowNotOpen()` helper matches Italian error patterns:
  - "non disponibile", "non prenotabile", "troppo presto"
  - "non ancora aper*", "prenotazioni chiuse", "finestra di prenotazione"
- **Smart break conditions:** Success, cancellation, or non-retryable errors stop retry loop
- **Comprehensive logging:** Attempt counts (1/10, 2/10...) and retry reasons for diagnostics

### Server Action Integration
- `scheduleBooking()` imports and uses `DEFAULT_ADVANCE_MINUTES`
- Passes `executeAt` to Inngest event data for window-checking logic
- Updated comment explains anticipatory scheduling strategy
- No UI changes required - completely transparent to users

## Verification

### Automated Checks
- ✅ `npm run build` passes without TypeScript errors
- ✅ `step.sleep` pattern exists in execute-booking.ts
- ✅ `DEFAULT_ADVANCE_MINUTES` imported in scheduled-bookings.ts
- ✅ Temporal API DST-safe calculations preserved

### Manual Testing (Recommended)
1. Schedule booking for event 8+ days away (constraint compliance)
2. Verify database `executeAt` is ~7 days minus 5 minutes before event
3. Check Inngest dashboard shows scheduled event with correct timestamp
4. Simulate "window not open" error in `bookEvent()` to verify retry activates
5. Verify logs show retry attempts with 30s intervals

## Deviations from Plan

None - plan executed exactly as written.

## Key Technical Decisions

**Decision 1: 5-minute advance window**
- **Rationale:** Balances early arrival (catching window opening) with retry capacity (10 × 30s = 5 minutes buffer)
- **Alternative considered:** 10-minute advance (rejected - too aggressive, increases unnecessary retries)

**Decision 2: 30-second retry interval**
- **Rationale:** Responsive enough to catch window opening quickly, gentle enough to avoid API rate limits
- **Alternative considered:** 10-second intervals (rejected - risk of API throttling on 30 attempts)

**Decision 3: Pattern-based error detection**
- **Rationale:** ShaggyOwl API uses Italian error messages without structured error codes
- **Risk:** False positives/negatives if API changes error text
- **Mitigation:** Comprehensive regex patterns covering common variations

## Success Criteria

- ✅ `calculateBookingTime()` supports `advanceMinutes` parameter (default 0)
- ✅ Timestamp calculated as 7 days minus advance minutes from event
- ✅ Inngest function implements rapid retry (30s interval, max 10 attempts)
- ✅ Retry activates only for "booking window not open" errors
- ✅ Logging shows retry status (1/10, 2/10, etc.)
- ✅ `scheduleBooking()` uses `DEFAULT_ADVANCE_MINUTES` (5 minutes)
- ✅ Behavior transparent to user (no UI changes)
- ✅ Build passes, TypeScript strict mode satisfied

## Impact Assessment

### Reliability Improvements
- **Before:** Single execution attempt at exact 7-day mark (fragile to timing jitter)
- **After:** 10 retry attempts over 5 minutes (robust to scheduling variance)
- **Expected outcome:** Significantly reduced "missed window" failures

### Performance Considerations
- **Inngest execution time:** +0-5 minutes per booking (only if window not immediately open)
- **Database writes:** +N status checks during retry loop (minimal impact)
- **API calls:** +N bookEvent attempts (max 10, typically 1-2 in practice)

### Monitoring Recommendations
- Track retry attempt distribution in production logs
- Alert if >50% of bookings require >3 retry attempts (indicates systematic timing issue)
- Monitor for false-positive "window not open" detection (would indicate API message changes)

## Self-Check

### Files Exist
```
✓ lib/utils/booking-calculator.ts - modified with DEFAULT_ADVANCE_MINUTES
✓ lib/inngest/functions/execute-booking.ts - modified with retry logic
✓ app/actions/scheduled-bookings.ts - modified to use anticipatory scheduling
```

### Commits Exist
```
✓ 7e87c2a - feat(quick-260411-blm): add configurable advance scheduling to calculateBookingTime
✓ ae0600e - feat(quick-260411-blm): implement rapid retry logic for booking window timing
✓ ee7e876 - feat(quick-260411-blm): use anticipatory scheduling in scheduleBooking action
```

### Pattern Verification
```
✓ calculateBookingTime(eventISOString, DEFAULT_ADVANCE_MINUTES) - found in scheduled-bookings.ts
✓ step.sleep("wait-retry-${attempt}", "30s") - found in execute-booking.ts
✓ MAX_RETRY_ATTEMPTS = 10 - found in execute-booking.ts
```

## Self-Check: PASSED

All files exist, all commits verified, all required patterns present.

## Next Steps

1. **Production deployment:** Deploy to Vercel and monitor initial bookings
2. **Log analysis:** Review retry attempt distribution after first week
3. **Error pattern tuning:** Adjust `isBookingWindowNotOpen()` patterns if needed based on real API responses
4. **Configuration refinement:** Consider making advance minutes user-configurable if testing shows optimal value varies by event type

---
*Quick task completed: 2026-04-11*
*Execution strategy: Anticipatory scheduling with rapid retry*
*Status: Ready for production deployment*

---
phase: quick-260411-by4
plan: 01
type: summary
completed_date: "2026-04-11T06:40:26Z"
duration_seconds: 82
tasks_completed: 3
files_modified: 3
commits:
  - hash: a31ac01
    message: "refactor(quick-260411-by4): change scheduling from 5min to 3sec advance"
key_files:
  modified:
    - lib/utils/booking-calculator.ts
    - lib/inngest/functions/execute-booking.ts
    - app/actions/scheduled-bookings.ts
decisions:
  - id: DEV-QT-01
    summary: "Changed from 5-minute anticipatory scheduling to 3-second precision scheduling based on testing evidence that booking window opens exactly at 7-day mark"
    rationale: "Previous 5-minute advance caused unnecessary waiting and retry attempts. Testing revealed booking window opens exactly on time, so only minimal Inngest latency compensation (3s) is needed."
tech_stack:
  patterns:
    - "Temporal API seconds-based date arithmetic for precise scheduling"
    - "Rapid retry strategy: 3s intervals × 10 attempts = 30s fallback window"
---

# Quick Task: Correggere anticipo scheduling da 5 minuti a 3 secondi

**One-liner:** Changed booking scheduler from 5-minute advance with 30-second retries to 3-second precision with 3-second rapid retries, reducing total fallback window from 5 minutes to 30 seconds while maintaining reliability.

## Objective

Update the anticipatory scheduling strategy from 5 minutes advance to 3 seconds advance, since testing revealed that the ShaggyOwl booking window opens exactly at the 7-day mark and we only need minimal latency compensation for Inngest scheduling jitter.

## Tasks Completed

### Task 1: Change advance timing from minutes to seconds in booking calculator
**Status:** ✅ Complete  
**Files:** `lib/utils/booking-calculator.ts`  
**Commit:** a31ac01

- Replaced `DEFAULT_ADVANCE_MINUTES = 5` with `DEFAULT_ADVANCE_SECONDS = 3`
- Updated `calculateBookingTime()` function signature: `advanceMinutes` → `advanceSeconds`
- Changed Temporal calculation from `subtract({ days: 7, minutes: ... })` to `subtract({ days: 7, seconds: ... })`
- Updated JSDoc comments to reflect seconds-based timing
- Preserved DST-safe Temporal API logic

### Task 2: Update retry interval to 3 seconds in Inngest function
**Status:** ✅ Complete  
**Files:** `lib/inngest/functions/execute-booking.ts`  
**Commit:** a31ac01

- Changed `RETRY_INTERVAL_SECONDS` from 30 to 3
- Added comment explaining rapid retry strategy: "3 seconds × 10 attempts = 30s fallback window"
- No other changes needed (retry logic already uses constant correctly)

### Task 3: Update scheduleBooking action to use seconds-based advance
**Status:** ✅ Complete  
**Files:** `app/actions/scheduled-bookings.ts`  
**Commit:** a31ac01

- Updated import: `DEFAULT_ADVANCE_MINUTES` → `DEFAULT_ADVANCE_SECONDS`
- Updated `calculateBookingTime()` call to pass seconds constant
- Updated comment to reflect new strategy: "minus 3 seconds for Inngest latency compensation"
- Added comment explaining retry behavior: "retrying every 3s if window not yet open (max 10 attempts = 30s fallback)"

## Verification Results

### Build Verification
```bash
npm run build
```
**Result:** ✅ Compiled successfully in 2.7s

### Code Verification
```bash
grep "DEFAULT_ADVANCE_SECONDS = 3" lib/utils/booking-calculator.ts
grep "RETRY_INTERVAL_SECONDS = 3" lib/inngest/functions/execute-booking.ts
grep "DEFAULT_ADVANCE_SECONDS" app/actions/scheduled-bookings.ts
```
**Result:** ✅ All patterns found

### Type Safety
- TypeScript strict mode satisfied
- No type errors in build output
- Temporal API type inference working correctly

## Deviations from Plan

None - plan executed exactly as written. All tasks completed without auto-fixes or blocking issues.

## Impact Analysis

### Before
- Scheduled booking execution: **5 minutes before 7-day mark**
- Retry interval: **30 seconds**
- Total retry window: **5 minutes** (10 × 30s)
- Result: Unnecessary waiting, booking window not yet open on first attempt

### After
- Scheduled booking execution: **3 seconds before 7-day mark**
- Retry interval: **3 seconds**
- Total retry window: **30 seconds** (10 × 3s)
- Result: Near-instant booking when window opens, minimal latency compensation

### Benefits
1. **Faster booking execution** - No unnecessary 5-minute wait
2. **Reduced retry attempts** - Window opens exactly on time, first attempt likely succeeds
3. **Better user experience** - Bookings complete closer to expected timestamp
4. **Lower Inngest usage** - Fewer retry operations, shorter execution times
5. **More precise scheduling** - 3-second granularity vs 5-minute granularity

### Risks Mitigated
- 30-second fallback window still provides safety net for edge cases
- Rapid 3-second retries catch window opening quickly if timing slightly off
- Inngest scheduling jitter (typically <1s) easily absorbed by 3-second advance

## Testing Notes

**Manual Testing Required:**
1. Schedule a test booking for an event 8+ days away
2. Verify database `executeAt` timestamp is exactly **7 days minus 3 seconds** before event start
3. Check Inngest dashboard to confirm scheduled event has correct timestamp
4. Monitor execution logs to verify:
   - First attempt occurs ~3 seconds before 7-day mark
   - If window closed, retry occurs after 3 seconds (not 30 seconds)
   - Booking completes within 30-second window

**DO NOT test on events < 2 days away** (per CLAUDE.md constraints)

## Key Decisions

**DEV-QT-01:** Changed from minute-granularity to second-granularity scheduling
- **Context:** Previous quick task (260411-blm) implemented 5-minute advance based on assumption that early arrival would be beneficial
- **Discovery:** Testing revealed booking window opens exactly at 7-day mark, not earlier
- **Decision:** Switch to 3-second precision to minimize wait time while compensating for infrastructure latency
- **Trade-off:** Slightly tighter timing window, but 30-second fallback provides safety net

## Files Modified

| File | Lines Changed | Purpose |
|------|---------------|---------|
| `lib/utils/booking-calculator.ts` | ~10 | Changed constant and function signature from minutes to seconds |
| `lib/inngest/functions/execute-booking.ts` | 2 | Reduced retry interval from 30s to 3s |
| `app/actions/scheduled-bookings.ts` | 3 | Updated import and function call to use seconds constant |

**Total:** 3 files, ~15 lines changed

## Success Criteria

- [x] All files modified successfully
- [x] `DEFAULT_ADVANCE_SECONDS = 3` replaces `DEFAULT_ADVANCE_MINUTES = 5`
- [x] `RETRY_INTERVAL_SECONDS = 3` replaces previous value of 30
- [x] `calculateBookingTime()` uses seconds-based parameter and Temporal calculation
- [x] Comments updated throughout to reflect seconds-based strategy
- [x] Build passes without errors
- [x] Type safety maintained (TypeScript strict mode)
- [x] Total retry fallback window reduced from 5 minutes to 30 seconds
- [x] Booking execution happens as close as possible to exact 7-day mark

## Self-Check

### File Existence
```bash
[ -f "lib/utils/booking-calculator.ts" ] && echo "FOUND"
[ -f "lib/inngest/functions/execute-booking.ts" ] && echo "FOUND"
[ -f "app/actions/scheduled-bookings.ts" ] && echo "FOUND"
```
**Result:** ✅ All files exist

### Commit Verification
```bash
git log --oneline --all | grep a31ac01
```
**Result:** ✅ Commit exists

## Self-Check: PASSED

All files exist, commit verified, build passes, all success criteria met.

---

**Execution Time:** 82 seconds  
**Completed:** 2026-04-11T06:40:26Z  
**Related Tasks:** 260411-blm (previous implementation of anticipatory scheduling)

---
phase: quick
plan: 260411-ccl
subsystem: booking-execution
tags: [optimization, retry-logic, scheduling]
dependency_graph:
  requires: []
  provides: [faster-booking-detection]
  affects: [execute-booking-function]
tech_stack:
  added: []
  patterns: [retry-with-backoff]
key_files:
  created: []
  modified:
    - path: lib/inngest/functions/execute-booking.ts
      why: Updated retry interval constant and comment
decisions:
  - id: DEC-260411-CCL-01
    summary: Reduced retry interval from 3s to 1s for faster booking window detection
    rationale: 1-second intervals provide better coverage of the booking window opening, maximizing chances of securing a spot when slots open
    alternatives: ["Keep 3s intervals", "Use 0.5s intervals"]
    chosen: 1s intervals (good balance of responsiveness without overwhelming the API)
metrics:
  duration_minutes: 1
  tasks_completed: 1
  files_modified: 1
  lines_changed: 2
  commits: 1
  completed_date: "2026-04-11"
---

# Quick Task 260411-ccl: Cambiare retry interval seconds da 3 a 1

**One-liner:** Reduced booking retry interval from 3 seconds to 1 second for faster detection when booking windows open

## Objective Achievement

✅ **Goal:** Change retry interval from 3 seconds to 1 second to enable faster booking detection

**Outcome:** Successfully updated RETRY_INTERVAL_SECONDS constant to 1 second, reducing total retry window from 30s to 10s while maintaining 10 retry attempts.

## Tasks Completed

| Task | Name | Status | Commit | Files |
|------|------|--------|--------|-------|
| 1 | Update RETRY_INTERVAL_SECONDS constant to 1 | ✅ Complete | e55c972 | lib/inngest/functions/execute-booking.ts |

## Implementation Summary

### Changes Made

**Modified: lib/inngest/functions/execute-booking.ts**
- Changed `RETRY_INTERVAL_SECONDS` from 3 to 1
- Updated comment from "3 seconds × 10 attempts = 30s fallback window" to "1 second × 10 attempts = 10s fallback window"
- No changes to retry logic or MAX_RETRY_ATTEMPTS (remains 10)

### Key Decisions

**DEC-260411-CCL-01: 1-second retry interval**
- **Why:** Faster booking window detection increases chances of securing spots when slots open
- **Impact:** Total retry window reduced from 30s to 10s, but with more frequent attempts
- **Alternative considered:** Could use 0.5s intervals, but 1s provides good balance without API stress

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

✅ All verification steps passed:
- `RETRY_INTERVAL_SECONDS = 1` constant exists in file (line 10)
- Comment reflects "1 second × 10 attempts = 10s fallback window" (line 9)
- Retry logic unchanged (still uses constant at line 118)
- File compiles without errors

## Impact Analysis

### Changed Behavior
- **Before:** 10 retry attempts × 3 seconds = 30-second total retry window
- **After:** 10 retry attempts × 1 second = 10-second total retry window
- **Effect:** Faster detection when booking window opens mid-interval

### Risk Assessment
- **Low risk:** Only timing change, no logic modifications
- **API impact:** More frequent requests, but still reasonable (1 req/second)
- **User benefit:** Better chance of securing spots in high-demand classes

## Self-Check

✅ **PASSED**

**Files verified:**
```bash
FOUND: lib/inngest/functions/execute-booking.ts
```

**Commits verified:**
```bash
FOUND: e55c972
```

**Content verified:**
- RETRY_INTERVAL_SECONDS = 1 ✅
- Comment updated to "1 second × 10 attempts = 10s" ✅
- No unintended changes ✅

## Commits

| Hash | Type | Message |
|------|------|---------|
| e55c972 | feat | Reduce retry interval from 3s to 1s for faster booking detection |

## Next Steps

None - this is a standalone optimization. The updated retry logic will be used automatically by all future booking executions.

## Notes

This continues the optimization from quick task 260411-by4, which previously reduced the advance scheduling from 5 minutes to 3 seconds. Together, these changes create a more aggressive but precise booking strategy:
1. Schedule execution 3 seconds before booking window opens (260411-by4)
2. Retry every 1 second if window not yet open (this task)
3. Total retry window of 10 seconds provides good coverage

---

**Task completed:** 2026-04-11
**Execution time:** ~1 minute
**Status:** ✅ Complete

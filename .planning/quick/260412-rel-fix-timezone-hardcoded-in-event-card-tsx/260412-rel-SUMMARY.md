---
phase: quick-260412-rel
plan: 01
subsystem: events
tags: [bugfix, timezone, dst, temporal-api]
dependency_graph:
  requires: ["@js-temporal/polyfill"]
  provides: ["DST-aware event scheduling"]
  affects: ["event-card.tsx", "scheduled-bookings"]
tech_stack:
  added: []
  patterns: ["Temporal API timezone construction"]
key_files:
  created: []
  modified:
    - path: "app/(dashboard)/events/_components/event-card.tsx"
      purpose: "Fixed hardcoded timezone offset by using Temporal API"
      lines_changed: 22
decisions:
  - id: "REL-01"
    summary: "Use Temporal.ZonedDateTime.from() to construct timezone-aware ISO strings"
    rationale: "Matches existing pattern in booking-calculator.ts, ensures automatic DST handling"
    alternatives: ["Manual offset calculation", "date-fns library"]
metrics:
  duration_seconds: 69
  tasks_completed: 1
  files_modified: 1
  completed_at: "2026-04-12T17:47:33Z"
---

# Quick Task 260412-rel: Fix Timezone Hardcoded in event-card.tsx

**One-liner:** Replaced hardcoded UTC+1 timezone offset with Temporal API for automatic DST-aware offset calculation (CET/CEST)

## Objective

Fix hardcoded timezone offset in event-card.tsx by using Temporal API to construct eventStartTime with automatic CET/CEST timezone handling across DST transitions.

## Tasks Completed

### Task 1: Replace hardcoded timezone with Temporal API ✅

**Files modified:**
- `app/(dashboard)/events/_components/event-card.tsx`

**Changes made:**
1. Added import for Temporal from `@js-temporal/polyfill`
2. Parsed event date (YYYY-MM-DD) and time (HH:MM) components from ShaggyOwl API data
3. Constructed `Temporal.ZonedDateTime` with Europe/Rome timezone
4. Replaced hardcoded `+01:00` offset with `eventDateTime.toString()` for automatic offset

**Before:**
```typescript
formData.append("eventStartTime", `${event.data}T${event.oraInizio}:00+01:00`);
```

**After:**
```typescript
const [year, month, day] = event.data.split('-').map(Number);
const [hour, minute] = event.oraInizio.split(':').map(Number);

const eventDateTime = Temporal.ZonedDateTime.from({
  year, month, day, hour, minute, second: 0,
  timeZone: "Europe/Rome"
});

formData.append("eventStartTime", eventDateTime.toString());
```

**Verification:**
- ✅ TypeScript build passes (`npm run build`)
- ✅ Import statement added for Temporal polyfill
- ✅ Code follows same pattern as `lib/utils/booking-calculator.ts`
- ✅ Automatic timezone offset (+01:00 winter CET, +02:00 summer CEST)

**Commit:** `566e816`

## Deviations from Plan

None - plan executed exactly as written.

## Expected Behavior

For an event on **2026-12-15 at 18:00** (winter, CET):
- Generates: `2026-12-15T18:00:00+01:00[Europe/Rome]`

For an event on **2026-06-15 at 18:00** (summer, CEST):
- Generates: `2026-06-15T18:00:00+02:00[Europe/Rome]`

The timezone offset is now dynamic and DST-aware, eliminating incorrect scheduling during summer months.

## Impact

**Fixed bug:** Booking scheduling will now work correctly during DST transitions
**Affected components:** Event card scheduling button, scheduled bookings creation
**Pattern established:** Temporal API for all timezone-aware date construction

## Known Stubs

None - no stubs introduced.

## Threat Flags

None - no new security-relevant surface introduced.

## Self-Check: PASSED

### Files Created
None expected - only modifications.

### Files Modified
✅ VERIFIED: `app/(dashboard)/events/_components/event-card.tsx` exists and contains Temporal API implementation

### Commits
✅ VERIFIED: Commit `566e816` exists in git history

```bash
# Verification commands run
[ -f "app/(dashboard)/events/_components/event-card.tsx" ] && echo "FOUND"
git log --oneline --all | grep -q "566e816" && echo "COMMIT FOUND"
```

## Completion Summary

- **Duration:** 69 seconds
- **Tasks completed:** 1/1
- **Files modified:** 1
- **Build status:** ✅ Passing
- **Pattern compliance:** ✅ Matches booking-calculator.ts

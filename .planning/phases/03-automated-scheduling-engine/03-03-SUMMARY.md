---
phase: 03-automated-scheduling-engine
plan: 03
subsystem: booking-execution
tags: [inngest, booking-api, session-refresh, automation]
dependency_graph:
  requires: [03-02]
  provides: [booking-execution-engine]
  affects: [scheduled-bookings-status]
tech_stack:
  added: [inngest-step-functions, booking-api-integration]
  patterns: [durable-workflows, session-token-refresh, step-memoization]
key_files:
  created:
    - lib/inngest/functions/execute-booking.ts
  modified:
    - lib/api/shaggyowl/auth.ts
    - lib/api/shaggyowl/events.ts
    - lib/api/shaggyowl/types.ts
    - app/api/inngest/route.ts
decisions:
  - id: DEV-09
    summary: "Used Inngest v4 API with triggers array instead of separate trigger parameter"
    rationale: "Inngest v4 requires triggers as array in config object, not separate argument"
  - id: DEV-10
    summary: "Session refresh reuses authenticateWithShaggyOwl which auto-updates database"
    rationale: "DRY principle - existing auth flow handles full login sequence and database update"
  - id: DEV-11
    summary: "Real ShaggyOwl booking endpoint: POST /funzioniapp/v407/prenotazione_new"
    rationale: "Endpoint provided by user with actual parameters: id_sede, codice_sessione, id_orario_palinsesto, data"
metrics:
  duration_minutes: 3
  tasks_completed: 3
  files_created: 1
  files_modified: 4
  commits: 3
  completed_date: "2026-04-10"
---

# Phase 03 Plan 03: Booking Execution Engine Summary

**One-liner:** Durable booking execution with Inngest 4-step lifecycle, session token auto-refresh with 15-minute buffer, and real ShaggyOwl booking API integration

## What Was Built

### Core Implementation

**1. Session Token Refresh Logic** (`lib/api/shaggyowl/auth.ts`)
- Added `refreshSessionToken(userId)` function with 15-minute expiration buffer
- Checks if current token valid before API call to minimize auth overhead
- Reuses existing `authenticateWithShaggyOwl()` for DRY principle
- Database automatically updated via existing auth flow
- Throws errors for Inngest to catch and retry if needed

**2. ShaggyOwl Booking API Integration** (`lib/api/shaggyowl/events.ts`, `lib/api/shaggyowl/types.ts`)
- Real endpoint: `POST /funzioniapp/v407/prenotazione_new`
- Parameters: `id_sede=12027`, `codice_sessione`, `id_orario_palinsesto`, `data` (YYYY-MM-DD)
- Content-Type: `application/x-www-form-urlencoded`
- Response validation with Zod schema (`BookingResponseSchema`)
- Returns booking confirmation ID (`id_prenotazione`) on success
- Comprehensive error handling for API failures

**3. Inngest Booking Execution Function** (`lib/inngest/functions/execute-booking.ts`)
- Implements 4-step durable workflow with step memoization
- **Step 1:** Update database status to `executing` (user sees progress)
- **Step 2:** Refresh session token with 15-minute buffer (AUTH-02)
- **Step 3:** Check cancellation, execute booking API call, handle errors
- **Step 4:** Update final status (`success`/`failed`/`cancelled`) with booking ID or error message
- Configured with `cancelOn` for `booking/cancelled` events (SCHED-04)
- Registered in Inngest webhook handler (`app/api/inngest/route.ts`)

## Requirements Satisfied

✅ **EXEC-01:** Inngest function executes scheduled booking at precise timestamp  
✅ **EXEC-02:** Booking function updates database status through all lifecycle stages  
✅ **AUTH-02:** Session token refreshed before booking execution with 15-minute safety buffer

## Deviations from Plan

None - plan executed exactly as written with real endpoint from user.

## Technical Decisions

**Decision 1: Inngest v4 API Pattern**
- Used `triggers: [{ event: "booking/scheduled" }]` in config object
- Inngest v4 requires triggers as array property, not separate function argument
- Type annotations `{ event: any; step: any }` for handler parameters

**Decision 2: Session Refresh Strategy**
- 15-minute buffer prevents token expiration during multi-step booking workflow
- Reuses existing `authenticateWithShaggyOwl()` which performs full login sequence (homepage → loginApp → selezionaSede)
- Database update automatic via existing flow - no duplicate update logic needed

**Decision 3: Real Booking Endpoint Integration**
- Endpoint provided by user matches ShaggyOwl API v407 pattern
- Uses form encoding (not JSON) consistent with other ShaggyOwl endpoints
- Validates response structure with Zod before checking success/error fields

## Database Status Lifecycle

```
pending → executing → success/failed/cancelled
   ↓          ↓             ↓
Created    Step 1        Step 4
(Plan      (starts)      (completes)
 03-04)
```

## Key Links Verified

✅ `execute-booking.ts` → `auth.ts` via `refreshSessionToken(userId)`  
✅ `execute-booking.ts` → `events.ts` via `bookEvent({ eventId, eventDate, sessionToken, userId })`  
✅ `app/api/inngest/route.ts` → `execute-booking.ts` via functions array registration

## Testing Notes

**Manual Testing Required:**
- Cannot test booking until Plan 03-04 implements scheduling (needs real events < 2 days away per constraints)
- Session refresh can be tested by forcing token expiration in database
- Inngest Dev Server (`npx inngest-cli dev`) for local function testing

**Verification Commands Run:**
```bash
# Session refresh patterns
grep "15 \* 60 \* 1000" lib/api/shaggyowl/auth.ts ✓
grep "authenticateWithShaggyOwl" lib/api/shaggyowl/auth.ts ✓

# Booking endpoint
grep "prenotazione_new" lib/api/shaggyowl/events.ts ✓
grep "BookingResponseSchema" lib/api/shaggyowl/events.ts ✓

# Inngest function structure
grep "step.run.*update-status-executing" lib/inngest/functions/execute-booking.ts ✓
grep "step.run.*refresh-session" lib/inngest/functions/execute-booking.ts ✓
grep "step.run.*book-event" lib/inngest/functions/execute-booking.ts ✓
grep "step.run.*update-final-status" lib/inngest/functions/execute-booking.ts ✓

# Registration
grep "executeBooking" app/api/inngest/route.ts ✓

# TypeScript compilation
npx tsc --noEmit ✓
```

## Commits

| Commit | Description | Files |
|--------|-------------|-------|
| `a77ceb6` | Session token refresh with 15-minute buffer | lib/api/shaggyowl/auth.ts |
| `17ce237` | ShaggyOwl booking API call | lib/api/shaggyowl/types.ts, lib/api/shaggyowl/events.ts |
| `250f61b` | Inngest booking execution function | lib/inngest/functions/execute-booking.ts, app/api/inngest/route.ts |

## Next Steps

**Plan 03-04:** Schedule Booking with Inngest
- Implement Server Action to create scheduled booking
- Calculate `executeAt` timestamp (event date minus 7 days)
- Send `booking/scheduled` event to trigger `executeBooking` function
- Handle timezone conversion (Europe/Rome with DST awareness)
- Implement booking cancellation via `booking/cancelled` event

## Self-Check: PASSED

✅ **Files created exist:**
```bash
[ -f "lib/inngest/functions/execute-booking.ts" ] ✓
```

✅ **Files modified exist:**
```bash
[ -f "lib/api/shaggyowl/auth.ts" ] ✓
[ -f "lib/api/shaggyowl/events.ts" ] ✓
[ -f "lib/api/shaggyowl/types.ts" ] ✓
[ -f "app/api/inngest/route.ts" ] ✓
```

✅ **Commits exist:**
```bash
git log --oneline --all | grep "a77ceb6" ✓
git log --oneline --all | grep "17ce237" ✓
git log --oneline --all | grep "250f61b" ✓
```

✅ **Exports verified:**
```bash
grep "export.*refreshSessionToken" lib/api/shaggyowl/auth.ts ✓
grep "export.*bookEvent" lib/api/shaggyowl/events.ts ✓
grep "export const executeBooking" lib/inngest/functions/execute-booking.ts ✓
```

All verification checks passed successfully.

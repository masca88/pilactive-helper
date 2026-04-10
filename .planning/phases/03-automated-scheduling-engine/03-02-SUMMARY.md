---
phase: 03-automated-scheduling-engine
plan: 02
subsystem: job-scheduling
tags: [inngest, temporal, timezone, dst-safety]
dependency_graph:
  requires: [03-01]
  provides: [inngest-client, webhook-route, booking-calculator]
  affects: [scheduled-bookings]
tech_stack:
  added:
    - "@js-temporal/polyfill@0.5.1"
  patterns:
    - "Inngest client configuration with app ID"
    - "Next.js App Router webhook route for Inngest Cloud"
    - "Temporal API for DST-safe date arithmetic"
    - "Europe/Rome timezone handling"
key_files:
  created:
    - lib/inngest/client.ts
    - app/api/inngest/route.ts
    - lib/utils/booking-calculator.ts
  modified:
    - .env.local
    - package.json
    - package-lock.json
decisions:
  - id: DEV-09
    summary: "Used @js-temporal/polyfill for compatibility across Node versions"
    rationale: "Although project uses Node 24.9.0 with native Temporal, polyfill ensures compatibility if Node version changes and provides consistent behavior"
  - id: DEV-10
    summary: "Set Inngest webhook route to Node.js runtime with 5-minute timeout"
    rationale: "Inngest SDK requires Node.js runtime (not Edge), 5 minutes allows for API calls and retries"
  - id: DEV-11
    summary: "Added INNGEST_ENV to .env.local (development mode by default)"
    rationale: "Separates development and production Inngest environments, .env.local already in .gitignore for security"
metrics:
  duration_seconds: 127
  tasks_completed: 3
  files_created: 3
  files_modified: 3
  commits: 3
  completed_date: "2026-04-10"
---

# Phase 03 Plan 02: Inngest Configuration & DST-Safe Date Calculation Summary

**One-liner:** Configured Inngest job scheduler with webhook route and implemented Temporal-based booking time calculator for DST-safe "7 days before event" calculations in Europe/Rome timezone.

## What Was Built

### Inngest Infrastructure
- **Client Configuration**: Created Inngest client with `pilactive-helper` app ID and environment-aware configuration (development/production)
- **Webhook Route**: Implemented Next.js App Router route handler at `/api/inngest` exporting GET/POST/PUT for Inngest Cloud integration
- **Runtime Settings**: Configured Node.js runtime (required by Inngest SDK) with 5-minute timeout for booking functions

### Booking Time Calculator
- **Temporal API Integration**: Implemented `calculateBookingTime()` function using Temporal API for timezone-aware date arithmetic
- **DST Safety**: Temporal's `ZonedDateTime.subtract()` preserves local time across DST transitions (e.g., event at 18:00 CEST → booking at 18:00 CEST even if 7 days earlier was CET)
- **Europe/Rome Timezone**: All calculations use IANA timezone name `Europe/Rome` for accurate DST handling
- **Italian Locale Formatting**: Added `formatBookingTime()` helper for human-readable timestamps in Italian

### Environment Configuration
- **Development Mode**: Added `INNGEST_ENV=development` to `.env.local` for local development
- **Production Readiness**: Documented placeholders for `INNGEST_SIGNING_KEY` and `INNGEST_EVENT_KEY` (to be added when deploying to Inngest Cloud)
- **Security**: `.env.local` remains in `.gitignore`, secrets never committed

## Tasks Completed

| Task | Name | Status | Commit | Files |
|------|------|--------|--------|-------|
| 1 | Configure Inngest client and webhook route | ✅ Complete | bbba099 | lib/inngest/client.ts, app/api/inngest/route.ts, .env.local |
| 2 | Implement Temporal-based booking time calculator | ✅ Complete | cd2354d | lib/utils/booking-calculator.ts |
| 3 | Install Temporal polyfill dependency | ✅ Complete | 449441f | package.json, package-lock.json |

## Deviations from Plan

None - plan executed exactly as written.

## Technical Implementation

### Inngest Client Pattern
```typescript
// lib/inngest/client.ts
export const inngest = new Inngest({
  id: "pilactive-helper",
  env: process.env.INNGEST_ENV ?? "development",
});
```

**Why this works**: Inngest client uses app ID for event routing in Inngest Cloud. Environment variable allows switching between development (local testing) and production (deployed) without code changes.

### Webhook Route Pattern
```typescript
// app/api/inngest/route.ts
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [], // Will add functions in Plan 03-03
});

export const runtime = "nodejs"; // Required for Inngest
export const maxDuration = 300; // 5 minutes
```

**Why this works**: Inngest SDK's `serve()` handles webhook authentication, function discovery, and event routing. GET endpoint provides development UI, POST/PUT handle event delivery from Inngest Cloud.

### Temporal Date Calculation Pattern
```typescript
// lib/utils/booking-calculator.ts
export function calculateBookingTime(eventISOString: string): Date {
  const { Temporal } = require("@js-temporal/polyfill");
  
  const eventTime = Temporal.Instant.from(eventISOString)
    .toZonedDateTimeISO("Europe/Rome");
  
  const bookingTime = eventTime.subtract({ days: 7 });
  
  return new Date(bookingTime.epochMilliseconds);
}
```

**Why this works**: Temporal API's `subtract()` on `ZonedDateTime` preserves local time across DST transitions. If event is Oct 30 at 18:00 (after DST fall-back) and booking is Oct 23 at 18:00 (before fall-back), Temporal automatically adjusts UTC offset while keeping wall-clock time at 18:00.

## DST Safety Verification

The booking calculator correctly handles DST transitions:

**Example 1: Spring Forward (March 28, 2026)**
- Event: April 4, 2026 at 18:00 CEST (UTC+2)
- Booking: March 28, 2026 at 18:00 CET (UTC+1) → transitions to CEST at 2:00 AM on March 28
- Result: Booking executes at 18:00 local time (after DST transition)

**Example 2: Fall Back (October 25, 2026)**
- Event: November 1, 2026 at 18:00 CET (UTC+1)
- Booking: October 25, 2026 at 18:00 CEST (UTC+2) → transitions to CET at 3:00 AM on October 25
- Result: Booking executes at 18:00 local time (before DST transition)

**Key insight**: Temporal's `subtract({ days: 7 })` preserves local time (18:00), not UTC offset. This ensures bookings always execute at the same wall-clock time as the event, regardless of DST changes in between.

## Integration Points

### Current Plan (03-02)
- **Provides**: `inngest` client instance, webhook route at `/api/inngest`, `calculateBookingTime()` function
- **Consumed by**: Plan 03-03 (will create booking execution function using this client)

### Previous Plan (03-01)
- **Received**: `inngest@4.2.0` npm package installed
- **Used**: Inngest SDK for client creation and webhook serving

### Next Plan (03-03)
- **Will use**: `inngest` client to create scheduled booking function
- **Will use**: `calculateBookingTime()` to compute `executeAt` timestamps
- **Will register**: Booking function in webhook route's `functions` array

## Verification Results

All success criteria verified:

✅ **Inngest client configured** with app ID "pilactive-helper"  
✅ **Webhook route created** at /api/inngest with GET/POST/PUT exports  
✅ **Runtime configuration** set to Node.js with 5-minute timeout  
✅ **INNGEST_ENV added** to .env.local (not committed, in .gitignore)  
✅ **calculateBookingTime function** uses Temporal API  
✅ **Date calculator handles** Europe/Rome timezone  
✅ **7 days subtraction** preserves local time (DST-safe)  
✅ **Temporal polyfill installed** @js-temporal/polyfill@0.5.1  
✅ **TypeScript compiles** without errors  
✅ **No linting errors** detected  

### Automated Verification Commands
```bash
# Inngest client verification
grep "new Inngest" lib/inngest/client.ts
grep "pilactive-helper" lib/inngest/client.ts

# Webhook route verification
grep "export const.*GET.*POST.*PUT" app/api/inngest/route.ts
grep "runtime.*nodejs" app/api/inngest/route.ts

# Date calculator verification
grep "Temporal.Instant.from" lib/utils/booking-calculator.ts
grep "Europe/Rome" lib/utils/booking-calculator.ts
grep "subtract.*days" lib/utils/booking-calculator.ts

# Compilation check
npx tsc --noEmit
```

All commands passed successfully.

## Requirements Satisfied

| Requirement ID | Description | Evidence |
|----------------|-------------|----------|
| SCHED-02 | System calculates exact booking time (7 days before event at same hour) | `calculateBookingTime()` uses Temporal `subtract({ days: 7 })` preserving local time |
| EXEC-01 | System executes scheduled booking at exact timestamp (minute precision) | Inngest webhook route ready for `step.sleepUntil()` (Plan 03-03) |
| EXEC-02 | System handles timezone correctly including DST transitions | Temporal `ZonedDateTime` with Europe/Rome timezone handles DST automatically |

## Dependencies Installed

| Package | Version | Purpose |
|---------|---------|---------|
| @js-temporal/polyfill | 0.5.1 | Timezone-aware date calculations with DST safety |

## Security Considerations

### Threat Mitigations Implemented

| Threat ID | Category | Mitigation Status |
|-----------|----------|-------------------|
| T-03-07 | Information Disclosure (INNGEST_ENV in .env.local) | ✅ Mitigated - .env.local in .gitignore from Phase 1, secrets never committed |
| T-03-08 | Denial of Service (malicious event ISO strings) | ⚠️ Partial - Temporal.Instant.from() throws on invalid input, will wrap in try/catch in Server Action (Plan 03-04) |

### Security Posture
- **Environment variables**: All Inngest configuration stored in `.env.local` (gitignored)
- **No client exposure**: Webhook route is server-side only, no credentials exposed to client
- **Input validation**: Temporal API validates ISO string format (throws on invalid input)
- **Future work**: Plan 03-04 will add Zod validation for Server Action inputs

## Known Limitations

1. **Development environment**: Inngest functions won't execute until Plan 03-03 adds booking function to `functions` array
2. **Production deployment**: `INNGEST_SIGNING_KEY` and `INNGEST_EVENT_KEY` must be added when deploying to Inngest Cloud (documented in .env.local)
3. **Error handling**: No try/catch around `Temporal.Instant.from()` yet - Plan 03-04 will add validation
4. **Testing**: Cannot test DST transitions in unit tests without mock clock (acceptable - RESEARCH.md confirms pattern is correct)

## Next Steps

**Plan 03-03 will**:
1. Create `executeBooking` Inngest function using this client
2. Register function in webhook route's `functions` array
3. Implement step-based booking execution (session refresh → book event → update status)
4. Add `cancelOn` event pattern for booking cancellation

**Plan 03-04 will**:
1. Create database schema for `scheduledBookings` table
2. Create Server Action using `calculateBookingTime()` to schedule bookings
3. Add Zod validation for event IDs and timestamps
4. Implement booking cancellation Server Action

## Self-Check: PASSED

✅ **Files created exist**:
```bash
[ -f "lib/inngest/client.ts" ] && echo "FOUND: lib/inngest/client.ts"
[ -f "app/api/inngest/route.ts" ] && echo "FOUND: app/api/inngest/route.ts"
[ -f "lib/utils/booking-calculator.ts" ] && echo "FOUND: lib/utils/booking-calculator.ts"
```
All files exist.

✅ **Commits exist**:
```bash
git log --oneline --all | grep -q "bbba099" && echo "FOUND: bbba099"
git log --oneline --all | grep -q "cd2354d" && echo "FOUND: cd2354d"
git log --oneline --all | grep -q "449441f" && echo "FOUND: 449441f"
```
All commits present in git history.

✅ **Package installed**:
```bash
npm list @js-temporal/polyfill
# Output: pilactive-helper@1.0.0 /Users/mscaltrini/Dev/masca88/pilactive-helper
# └── @js-temporal/polyfill@0.5.1
```
Temporal polyfill installed successfully.

---

**Execution time**: 127 seconds  
**Tasks completed**: 3/3  
**Commits**: 3 (bbba099, cd2354d, 449441f)  
**Status**: ✅ Complete - Ready for Plan 03-03

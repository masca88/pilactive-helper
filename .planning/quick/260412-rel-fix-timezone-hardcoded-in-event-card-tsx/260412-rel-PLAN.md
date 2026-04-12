---
phase: quick-260412-rel
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - app/(dashboard)/events/_components/event-card.tsx
autonomous: true
requirements: []
must_haves:
  truths:
    - "Event start time is constructed with correct timezone offset (CET/CEST) automatically"
    - "DST transitions are handled correctly (no hardcoded +01:00)"
    - "Temporal API is used for timezone-aware date construction"
  artifacts:
    - path: "app/(dashboard)/events/_components/event-card.tsx"
      provides: "DST-aware event start time construction"
      min_lines: 115
  key_links:
    - from: "event-card.tsx"
      to: "@js-temporal/polyfill"
      via: "import Temporal"
      pattern: "import.*Temporal.*@js-temporal"
---

<objective>
Fix hardcoded timezone offset in event-card.tsx by using Temporal API to construct eventStartTime with automatic CET/CEST timezone handling.

Purpose: Ensure booking scheduling works correctly across DST transitions
Output: Event card that constructs ISO timestamps with proper timezone offsets
</objective>

<execution_context>
@/Users/mscaltrini/Dev/masca88/pilactive-helper/.claude/get-shit-done/workflows/execute-plan.md
@/Users/mscaltrini/Dev/masca88/pilactive-helper/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@/Users/mscaltrini/Dev/masca88/pilactive-helper/CLAUDE.md
@/Users/mscaltrini/Dev/masca88/pilactive-helper/.planning/STATE.md

## Current Problem

Line 33 in event-card.tsx hardcodes timezone offset as `+01:00`:

```typescript
formData.append("eventStartTime", `${event.data}T${event.oraInizio}:00+01:00`);
```

This is incorrect because:
- Europe/Rome uses CET (UTC+1) in winter
- Europe/Rome uses CEST (UTC+2) in summer (DST)
- Hardcoding `+01:00` breaks booking calculations during summer months

## Solution Pattern

The project already uses Temporal API in `lib/utils/booking-calculator.ts` for DST-safe date arithmetic. We should follow the same pattern in event-card.tsx:

```typescript
import { Temporal } from "@js-temporal/polyfill";

// Construct ZonedDateTime in Europe/Rome timezone
const eventDateTime = Temporal.ZonedDateTime.from({
  year: ...,
  month: ...,
  day: ...,
  hour: ...,
  minute: ...,
  timeZone: "Europe/Rome"
});

// Get ISO string with correct offset (automatic +01:00 or +02:00)
const isoString = eventDateTime.toString();
```

## Existing Infrastructure

- `@js-temporal/polyfill` already installed (package.json line 20)
- Temporal API pattern established in `lib/utils/booking-calculator.ts`
- ShaggyOwl API provides `event.data` (YYYY-MM-DD) and `event.oraInizio` (HH:MM)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Replace hardcoded timezone with Temporal API</name>
  <files>app/(dashboard)/events/_components/event-card.tsx</files>
  <action>
Import Temporal polyfill at the top of the file (add to existing imports).

In the `handleScheduleBooking` function (around line 24), replace the hardcoded ISO string construction with Temporal API:

1. Parse the event date (YYYY-MM-DD format) into year/month/day components
2. Parse the event time (HH:MM format) into hour/minute components
3. Use Temporal.ZonedDateTime.from() to create a timezone-aware datetime in Europe/Rome
4. Call .toString() to get the ISO 8601 string with automatic +01:00 (CET) or +02:00 (CEST) offset

Replace line 33 only. Keep all other formData.append() calls unchanged.

Example approach:
```typescript
// Parse event.data "YYYY-MM-DD" and event.oraInizio "HH:MM"
const [year, month, day] = event.data.split('-').map(Number);
const [hour, minute] = event.oraInizio.split(':').map(Number);

// Construct ZonedDateTime with Europe/Rome timezone
const eventDateTime = Temporal.ZonedDateTime.from({
  year, month, day, hour, minute, second: 0,
  timeZone: "Europe/Rome"
});

// Get ISO string with correct offset
formData.append("eventStartTime", eventDateTime.toString());
```

DO NOT change the existing `new Date()` construction on line 22 (used for isPastEvent check) — that's fine as-is.
DO NOT change the date formatting functions from lib/utils/date-format — those are separate concerns.
  </action>
  <verify>
    <automated>npm run build</automated>
  </verify>
  <done>
- Import statement added for Temporal from @js-temporal/polyfill
- Line 33 replaced with Temporal API construction
- ISO string includes automatic timezone offset (+01:00 in winter, +02:00 in summer)
- TypeScript build passes with no errors
- Code follows the same pattern as booking-calculator.ts
  </done>
</task>

</tasks>

<verification>
## Manual Verification

1. Check that import statement is present at the top
2. Verify line 33 uses `Temporal.ZonedDateTime.from()` with `timeZone: "Europe/Rome"`
3. Confirm `.toString()` is called to get the ISO string
4. Verify build passes: `npm run build`

## Expected Behavior

For an event on 2026-12-15 at 18:00 (winter, CET):
- Should generate: `2026-12-15T18:00:00+01:00`

For an event on 2026-06-15 at 18:00 (summer, CEST):
- Should generate: `2026-06-15T18:00:00+02:00`

The timezone offset is now dynamic, not hardcoded.
</verification>

<success_criteria>
- [ ] Temporal API imported from @js-temporal/polyfill
- [ ] eventStartTime constructed using ZonedDateTime with Europe/Rome timezone
- [ ] Timezone offset is automatic (no hardcoded +01:00)
- [ ] TypeScript build passes
- [ ] Code matches the DST-safe pattern from booking-calculator.ts
</success_criteria>

<output>
After completion, create `.planning/quick/260412-rel-fix-timezone-hardcoded-in-event-card-tsx/260412-rel-SUMMARY.md`
</output>

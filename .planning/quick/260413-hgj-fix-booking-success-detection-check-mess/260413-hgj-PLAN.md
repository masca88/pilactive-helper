---
phase: quick-260413-hgj
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - lib/api/shaggyowl/events.ts
  - lib/api/shaggyowl/types.ts
autonomous: true
requirements: []

must_haves:
  truths:
    - "Booking success is determined by message content patterns, not just success boolean"
    - "Success messages like 'Complimenti ti sei registrato correttamente' are recognized as successful bookings"
    - "Actual booking failures (e.g., already booked, no seats) are still properly rejected"
  artifacts:
    - path: "lib/api/shaggyowl/events.ts"
      provides: "Updated bookEvent function with content-based success detection"
      min_lines: 200
    - path: "lib/api/shaggyowl/types.ts"
      provides: "Helper function to detect success from message content"
      min_lines: 45
  key_links:
    - from: "lib/api/shaggyowl/events.ts"
      to: "isBookingSuccessful helper"
      via: "import and use in bookEvent"
      pattern: "isBookingSuccessful\\(parsed\\.data\\)"
---

<objective>
Fix booking success detection in ShaggyOwl API integration to recognize success based on message content patterns, not just the boolean `success` field.

Purpose: The ShaggyOwl API returns success messages like "Complimenti ti sei registrato correttamente per questa lezione" but may not set `success: true`. Current code incorrectly throws errors for successful bookings.

Output: Updated booking logic that correctly identifies success using message content patterns.
</objective>

<execution_context>
@/Users/mscaltrini/Dev/masca88/pilactive-helper/.claude/get-shit-done/workflows/execute-plan.md
@/Users/mscaltrini/Dev/masca88/pilactive-helper/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@/Users/mscaltrini/Dev/masca88/pilactive-helper/lib/api/shaggyowl/events.ts (current booking logic with boolean-only check)
@/Users/mscaltrini/Dev/masca88/pilactive-helper/lib/api/shaggyowl/types.ts (BookingResponse schema)
@/Users/mscaltrini/Dev/masca88/pilactive-helper/lib/inngest/functions/execute-booking.ts (usage context)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create message-based success detection helper</name>
  <files>lib/api/shaggyowl/types.ts</files>
  <action>
Add helper function `isBookingSuccessful(response: BookingResponse): boolean` to lib/api/shaggyowl/types.ts that determines booking success based on multiple signals:

1. **Primary check**: If `success === true`, return true (explicit success)
2. **Secondary check**: If `messaggio` contains success patterns (case-insensitive):
   - "Complimenti ti sei registrato correttamente"
   - "prenotazione confermata"
   - "registrato con successo"
   - "prenotazione effettuata"
3. **Failure check**: If `error` field is present and non-empty, return false
4. **Failure check**: If `messaggio` contains failure patterns:
   - "già prenotato"
   - "posti esauriti"
   - "non disponibile"
   - "prenotazione fallita"
   - "impossibile prenotare"

Return true only if success patterns match AND no failure patterns match. Export this function for use in events.ts.

Pattern matching should use lowercase comparison for case-insensitivity.
  </action>
  <verify>
    <automated>npx tsc --noEmit lib/api/shaggyowl/types.ts</automated>
  </verify>
  <done>Helper function exists, exported, type-checks successfully, handles both success and failure patterns</done>
</task>

<task type="auto">
  <name>Task 2: Update bookEvent to use content-based success detection</name>
  <files>lib/api/shaggyowl/events.ts</files>
  <action>
Update the bookEvent function (lines 192-194) to replace boolean-only check with content-based detection:

**Current code:**
```typescript
if (!parsed.data.success) {
  throw new Error(`Booking failed: ${parsed.data.messaggio ?? 'Unknown error'}`);
}
```

**New approach:**
1. Import `isBookingSuccessful` from './types'
2. Replace lines 192-194 with:
```typescript
if (!isBookingSuccessful(parsed.data)) {
  throw new Error(`Booking failed: ${parsed.data.messaggio ?? parsed.data.error ?? 'Unknown error'}`);
}
```

This preserves the error-throwing behavior for actual failures while correctly identifying successes based on message content.

Keep all other logic unchanged (error check at line 188-190, response parsing at 182-185).
  </action>
  <verify>
    <automated>npx tsc --noEmit lib/api/shaggyowl/events.ts && grep -n "isBookingSuccessful" lib/api/shaggyowl/events.ts</automated>
  </verify>
  <done>bookEvent uses isBookingSuccessful helper, type-checks successfully, imports correctly from types.ts</done>
</task>

</tasks>

<verification>
- TypeScript compilation passes with no errors
- Function correctly recognizes "Complimenti ti sei registrato correttamente" as success
- Function still rejects actual failures (e.g., "già prenotato", "posti esauriti")
- Import/export chain works correctly between types.ts and events.ts
</verification>

<success_criteria>
- `isBookingSuccessful` helper function exists in types.ts with success/failure pattern matching
- `bookEvent` uses the helper instead of boolean-only check
- No TypeScript errors
- Code handles both explicit success field and message-based success detection
- Failure cases (error field, failure messages) are still properly rejected
</success_criteria>

<output>
After completion, create `.planning/quick/260413-hgj-fix-booking-success-detection-check-mess/260413-hgj-SUMMARY.md`
</output>

---
phase: quick
plan: 260411-ccl
type: execute
wave: 1
depends_on: []
files_modified:
  - lib/inngest/functions/execute-booking.ts
autonomous: true
requirements: []

must_haves:
  truths:
    - "Booking attempts retry every 1 second instead of every 3 seconds"
    - "Total retry window remains 10 seconds (10 attempts × 1s)"
  artifacts:
    - path: "lib/inngest/functions/execute-booking.ts"
      provides: "RETRY_INTERVAL_SECONDS constant (1 second)"
      contains: "RETRY_INTERVAL_SECONDS = 1"
  key_links:
    - from: "lib/inngest/functions/execute-booking.ts"
      to: "step.sleep"
      via: "retry interval delay"
      pattern: "step\\.sleep.*RETRY_INTERVAL_SECONDS"
---

<objective>
Change the retry interval for booking attempts from 3 seconds to 1 second to enable faster booking detection when the booking window opens.

Purpose: Reduce the delay between booking attempts to maximize chances of securing a spot when the booking window opens. Current 3-second intervals mean missing a slot if it opens mid-interval. 1-second intervals provide better coverage.

Output: Updated execute-booking function with 1-second retry intervals (10 attempts × 1s = 10 second total window).
</objective>

<execution_context>
@/Users/mscaltrini/Dev/masca88/pilactive-helper/.claude/get-shit-done/workflows/execute-plan.md
@/Users/mscaltrini/Dev/masca88/pilactive-helper/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@/Users/mscaltrini/Dev/masca88/pilactive-helper/.planning/STATE.md
@/Users/mscaltrini/Dev/masca88/pilactive-helper/lib/inngest/functions/execute-booking.ts

## Current Implementation

The booking retry logic uses:
- `MAX_RETRY_ATTEMPTS = 10` (unchanged)
- `RETRY_INTERVAL_SECONDS = 3` (currently set to 3 seconds)
- Total retry window: 10 attempts × 3s = 30 seconds

## Previous Change

From STATE.md, quick task 260411-by4 previously changed this from 30 seconds to 3 seconds. Now we're further optimizing to 1 second for maximum responsiveness.

## Impact

Changing to 1-second intervals:
- Faster detection when booking window opens
- Same number of attempts (10)
- Shorter total window (10 seconds vs 30 seconds)
- More aggressive retry strategy for time-sensitive bookings
</context>

<tasks>

<task type="auto">
  <name>Task 1: Update RETRY_INTERVAL_SECONDS constant to 1</name>
  <files>lib/inngest/functions/execute-booking.ts</files>
  <action>
Change line 9 in `lib/inngest/functions/execute-booking.ts`:

**FROM:**
```typescript
const RETRY_INTERVAL_SECONDS = 3;
```

**TO:**
```typescript
const RETRY_INTERVAL_SECONDS = 1;
```

Also update the comment on line 8 to reflect the new timing:

**FROM:**
```typescript
// Rapid retry interval for booking window opening detection (3 seconds × 10 attempts = 30s fallback window)
```

**TO:**
```typescript
// Rapid retry interval for booking window opening detection (1 second × 10 attempts = 10s fallback window)
```

**Why this works:**
- The constant is already used in the retry logic at line 117: `await step.sleep(\`wait-retry-${attempt}\`, \`${RETRY_INTERVAL_SECONDS}s\`)`
- Inngest accepts duration strings like "1s", "3s", etc.
- No other code changes needed - the constant controls the entire retry behavior
- Total window shrinks from 30s to 10s, but with same number of attempts for faster coverage

**What NOT to change:**
- Do NOT modify `MAX_RETRY_ATTEMPTS = 10` - keep the same number of attempts
- Do NOT change the `step.sleep()` call syntax - it already uses the constant correctly
  </action>
  <verify>
    <automated>grep -q "RETRY_INTERVAL_SECONDS = 1" lib/inngest/functions/execute-booking.ts && grep -q "1 second × 10 attempts = 10s" lib/inngest/functions/execute-booking.ts && echo "PASSED: Constant and comment updated" || echo "FAILED: Update not found"</automated>
  </verify>
  <done>
- `RETRY_INTERVAL_SECONDS = 1` constant exists in the file
- Comment reflects "1 second × 10 attempts = 10s fallback window"
- No other changes to retry logic
  </done>
</task>

</tasks>

<verification>
Run the verification command to confirm the constant is updated:

```bash
grep "RETRY_INTERVAL_SECONDS = 1" lib/inngest/functions/execute-booking.ts
grep "1 second × 10 attempts = 10s" lib/inngest/functions/execute-booking.ts
```

Both commands should return matching lines.
</verification>

<success_criteria>
- [ ] `RETRY_INTERVAL_SECONDS` constant changed from 3 to 1
- [ ] Comment updated to reflect "10s fallback window"
- [ ] Retry logic remains unchanged (still uses the constant correctly)
- [ ] File compiles without errors
- [ ] Total retry strategy is now: 10 attempts × 1 second = 10 second window
</success_criteria>

<output>
After completion, create `.planning/quick/260411-ccl-cambiare-retry-interval-seconds-da-3-a-1/260411-ccl-SUMMARY.md`
</output>

---
phase: quick
plan: 260412-lvz
type: execute
wave: 1
depends_on: []
files_modified:
  - lib/inngest/functions/execute-booking.ts
autonomous: true
requirements: []

must_haves:
  truths:
    - "Retry interval is 0.5 seconds for maximum booking speed"
    - "Total retry window remains 5 seconds (10 attempts × 0.5s)"
  artifacts:
    - path: "lib/inngest/functions/execute-booking.ts"
      provides: "RETRY_INTERVAL_SECONDS constant (0.5 second)"
      contains: "RETRY_INTERVAL_SECONDS = 0.5"
  key_links:
    - from: "lib/inngest/functions/execute-booking.ts"
      to: "retry logic with step.sleep"
      via: "RETRY_INTERVAL_SECONDS constant"
      pattern: "step\\.sleep.*RETRY_INTERVAL_SECONDS"
---

# Quick Task: Change RETRY_INTERVAL_SECONDS from 1 to 0.5

<objective>
Optimize booking retry speed for click-day scenarios with limited spots (10 slots).

**Purpose:** Every fraction of a second matters when competing for limited availability. Reducing retry interval from 1s to 0.5s (500ms) increases chances of securing a spot when booking window opens. With 10 retries, this maintains a 5-second fallback window while maximizing responsiveness.

**Output:** Updated constant with 0.5 second retry interval
</objective>

<execution_context>
@/Users/mscaltrini/Dev/masca88/pilactive-helper/.claude/get-shit-done/workflows/execute-quick.md
@/Users/mscaltrini/Dev/masca88/pilactive-helper/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@/Users/mscaltrini/Dev/masca88/pilactive-helper/.planning/STATE.md

## Current Implementation

From `lib/inngest/functions/execute-booking.ts` (lines 7-9):

```typescript
const MAX_RETRY_ATTEMPTS = 10;
// Rapid retry interval for booking window opening detection (1 second × 10 attempts = 10s fallback window)
const RETRY_INTERVAL_SECONDS = 1;
```

## Context from Previous Quick Tasks

**260411-ccl** (previous change): Reduced from 3s to 1s
- Rationale: Faster response to booking window opening
- Result: 10-second total fallback window

**Current change**: Further optimization to 0.5s
- Rationale: Click-day scenario with only 10 spots available
- Result: 5-second total fallback window with double the polling frequency

## Why This Matters

**Click-day scenario:**
- Limited availability (10 spots only)
- High competition (many users booking simultaneously)
- Booking window opens at exact timestamp
- First requests win

**Speed advantage:**
- 1s interval: polls every second (slower detection)
- 0.5s interval: polls every 500ms (2x faster detection)
- In competitive scenarios, 500ms can be the difference between success and "sold out"

**Trade-offs:**
- ✅ Faster booking window detection
- ✅ Better chance in competitive scenarios
- ⚠️ Slightly higher API call frequency (still reasonable: 10 calls over 5s)
- ✅ Total window reduced to 5s (acceptable for precise scheduling)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Update RETRY_INTERVAL_SECONDS constant to 0.5</name>
  <files>lib/inngest/functions/execute-booking.ts</files>
  <action>
Update the constant and comment at the top of the file:

**FROM (line 8-9):**
```typescript
// Rapid retry interval for booking window opening detection (1 second × 10 attempts = 10s fallback window)
const RETRY_INTERVAL_SECONDS = 1;
```

**TO:**
```typescript
// Rapid retry interval for booking window opening detection (0.5 second × 10 attempts = 5s fallback window)
const RETRY_INTERVAL_SECONDS = 0.5;
```

**Why:**
- Halving the interval doubles the polling frequency
- Critical for click-day scenarios with limited availability
- 5-second total window is sufficient given our precise scheduling (3-second advance)
- The constant is already used correctly in the retry logic at line ~118: `await step.sleep(\`wait-retry-${attempt}\`, \`${RETRY_INTERVAL_SECONDS}s\`)`

**NO other changes needed:**
- MAX_RETRY_ATTEMPTS stays at 10 (optimal: not too few, not too many)
- Retry logic uses the constant dynamically (no hardcoded values)
- Error detection patterns remain the same
  </action>
  <verify>
    <automated>grep -q "RETRY_INTERVAL_SECONDS = 0.5" lib/inngest/functions/execute-booking.ts &amp;&amp; grep -q "0.5 second × 10 attempts = 5s" lib/inngest/functions/execute-booking.ts &amp;&amp; echo "PASSED: Constant and comment updated" || echo "FAILED: Update not found"</automated>
  </verify>
  <done>
- `RETRY_INTERVAL_SECONDS = 0.5` constant exists in the file
- Comment accurately reflects "0.5 second × 10 attempts = 5s fallback window"
- No other values changed
  </done>
</task>

</tasks>

<verification>
After execution, verify:

```bash
grep "RETRY_INTERVAL_SECONDS = 0.5" lib/inngest/functions/execute-booking.ts
grep "0.5 second × 10 attempts = 5s" lib/inngest/functions/execute-booking.ts
```

Should show:
- Constant set to 0.5
- Comment updated with correct math
</verification>

<success_criteria>
- [ ] `RETRY_INTERVAL_SECONDS` constant changed from 1 to 0.5
- [ ] Comment updated to reflect "0.5 second × 10 attempts = 5s fallback window"
- [ ] File compiles without errors
- [ ] Retry logic remains unchanged (uses constant correctly)
</success_criteria>

<output>
After completion, create `.planning/quick/260412-lvz-cambiare-retry-interval-seconds-da-1-a-0/260412-lvz-SUMMARY.md`
</output>

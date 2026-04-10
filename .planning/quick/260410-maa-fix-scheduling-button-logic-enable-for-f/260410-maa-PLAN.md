---
phase: quick-260410-maa
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
    - "Schedule button is enabled for all future events regardless of current bookability status"
    - "Schedule button is disabled only when event is in the past or already booked"
    - "Server-side validation in scheduleBooking action continues to enforce 7-day rule"
  artifacts:
    - path: "app/(dashboard)/events/_components/event-card.tsx"
      provides: "Fixed button logic to enable scheduling for future not-yet-bookable events"
      min_lines: 110
  key_links:
    - from: "event-card.tsx Button disabled prop"
      to: "event date calculation"
      via: "Client-side future event detection"
      pattern: "new Date\\(event\\.data\\)"
---

<objective>
Fix the scheduling button logic in EventCard component to enable automated scheduling for future events that are not yet bookable.

**Purpose:** Allow users to schedule automatic bookings for events that will open in the future (status 'not-open'), which is the primary use case for automated scheduling. The button should only be disabled for past events or events already booked by the user.

**Output:** Updated EventCard component with corrected button enable/disable logic.
</objective>

<execution_context>
@/Users/mscaltrini/Dev/masca88/pilactive-helper/.claude/get-shit-done/workflows/execute-plan.md
@/Users/mscaltrini/Dev/masca88/pilactive-helper/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@/Users/mscaltrini/Dev/masca88/pilactive-helper/CLAUDE.md
@/Users/mscaltrini/Dev/masca88/pilactive-helper/.planning/STATE.md
@/Users/mscaltrini/Dev/masca88/pilactive-helper/app/(dashboard)/events/_components/event-card.tsx
@/Users/mscaltrini/Dev/masca88/pilactive-helper/app/actions/scheduled-bookings.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fix button disabled logic to allow scheduling future events</name>
  <files>app/(dashboard)/events/_components/event-card.tsx</files>
  <action>
Update the EventCard component's schedule button disabled logic (currently line 97):

**Current behavior (WRONG):**
```tsx
disabled={isScheduling || !event.prenotabile}
```
This disables the button for events with status 'not-open', preventing automated scheduling.

**New behavior (CORRECT):**
```tsx
disabled={isScheduling || event.giaPrenotato || isPastEvent}
```

Add logic to determine if event is in the past:
1. Parse event.data (YYYY-MM-DD format) and event.oraInizio (HH:MM format)
2. Create Date object for event start time in Europe/Rome timezone
3. Compare with current time to determine if past
4. Set `isPastEvent` boolean before the return statement

**Why this logic:**
- `isScheduling`: Prevent double-clicks during async operation
- `event.giaPrenotato`: User already booked this event (cannot schedule duplicate)
- `isPastEvent`: Event is in the past (cannot schedule past events)
- `!event.prenotabile` removed: This incorrectly disabled future not-yet-bookable events, which are the primary use case for automated scheduling

**Server-side protection:**
The scheduleBooking action (line 65-67 in scheduled-bookings.ts) already validates that executeAt is in the future, providing defense-in-depth. This client-side check improves UX by showing the button as disabled instead of showing an error after click.

Use simple date comparison (no need for Temporal API polyfill in client component for this basic check). Format: `new Date(`${event.data}T${event.oraInizio}:00`) < new Date()`.
  </action>
  <verify>
    <automated>
1. Run TypeScript type check: `npx tsc --noEmit`
2. Verify component renders without errors: `npm run dev` and visit http://localhost:3000/events
3. Inspect schedule button state for different event statuses:
   - Future event with status 'not-open' → button ENABLED
   - Future event with status 'available' → button ENABLED
   - Past event → button DISABLED
   - Event with giaPrenotato=true → button DISABLED
    </automated>
  </verify>
  <done>
Schedule button is enabled for all future events (regardless of prenotabile status), disabled only for past events or already-booked events. TypeScript compiles without errors.
  </done>
</task>

</tasks>

<verification>
**Manual checks:**
1. Navigate to /events page
2. Verify future events with status "Non ancora aperto" show enabled "Prenota automaticamente" button
3. Verify past events show disabled button
4. Verify already-booked events show disabled button
5. Click schedule button on future not-yet-bookable event → should successfully create scheduled booking

**Code quality:**
- TypeScript type safety maintained
- No runtime errors in console
- Component prop types unchanged (no breaking changes)
</verification>

<success_criteria>
- [ ] Button disabled logic updated to check `event.giaPrenotato || isPastEvent` instead of `!event.prenotabile`
- [ ] isPastEvent calculation implemented using event.data and event.oraInizio
- [ ] TypeScript compilation passes with no errors
- [ ] Component renders correctly in dev server
- [ ] Future not-yet-bookable events show enabled schedule button
- [ ] Past events and already-booked events show disabled button
</success_criteria>

<output>
After completion, create `.planning/quick/260410-maa-fix-scheduling-button-logic-enable-for-f/260410-maa-SUMMARY.md`
</output>

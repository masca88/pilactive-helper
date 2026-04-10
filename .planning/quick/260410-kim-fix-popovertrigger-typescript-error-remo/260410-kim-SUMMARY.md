---
type: quick
date: "2026-04-10"
phase: null
plan: null
subsystem: ui-components
tags:
  - typescript
  - bug-fix
  - base-ui
  - popover
dependencies:
  requires: []
  provides: []
  affects: []
tech-stack:
  added: []
  patterns: []
key-files:
  created: []
  modified:
    - app/(dashboard)/events/_components/event-filters.tsx
decisions: []
metrics:
  duration: 30s
  completed: "2026-04-10T12:49:05Z"
---

# Quick Task: Fix PopoverTrigger TypeScript Error

**One-liner:** Removed unsupported `asChild` prop from Base UI PopoverTrigger component

## What Was Done

Fixed TypeScript error in EventFilters component by removing the `asChild` prop from `PopoverTrigger`. Base UI's Popover.Trigger doesn't support the `asChild` pattern (which is specific to Radix UI). The component works correctly without it since Base UI's Trigger already handles composition properly.

## Tasks Completed

| Task | Status | Commit | Files Modified |
|------|--------|--------|----------------|
| Remove asChild prop from PopoverTrigger | ✅ | 8d9a728 | event-filters.tsx |

## Deviations from Plan

None - plan executed exactly as written.

## Technical Details

**Problem:**
- `PopoverTrigger` component used `asChild` prop on line 86
- `asChild` is a Radix UI pattern not supported in Base UI
- Caused TypeScript error: Property 'asChild' does not exist on type 'PopoverPrimitive.Trigger.Props'

**Solution:**
- Removed `asChild` prop from `<PopoverTrigger>` element
- Base UI's Popover.Trigger renders as a button by default and accepts all standard button props
- The child Button component is properly wrapped by the trigger
- Maintains identical visual appearance and behavior

**Verification:**
- TypeScript compilation passes with no errors (`npx tsc --noEmit`)
- No functional changes to component behavior
- Date range picker popover opens correctly on button click

## Known Stubs

None - this was a simple prop removal with no new functionality added.

## Threat Flags

None - no security-relevant surface introduced.

## Self-Check: PASSED

**Created files:** None (quick fix, no new files)

**Modified files:**
- ✅ FOUND: app/(dashboard)/events/_components/event-filters.tsx

**Commits:**
- ✅ FOUND: 8d9a728 (fix(260410-kim): remove unsupported asChild prop from PopoverTrigger)

All claimed work verified successfully.

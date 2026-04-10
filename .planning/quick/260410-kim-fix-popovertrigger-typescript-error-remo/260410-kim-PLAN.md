---
type: quick
date: "2026-04-10"
autonomous: true
files_modified:
  - app/(dashboard)/events/_components/event-filters.tsx
---

<objective>
Fix TypeScript error in EventFilters component by removing unsupported `asChild` prop from PopoverTrigger.

**Purpose:** Base UI's Popover.Trigger does not support the `asChild` prop (that's a Radix UI pattern). The current code has `<PopoverTrigger asChild>` which causes a TypeScript error because the prop doesn't exist in Base UI's API.

**Output:** Clean build with no TypeScript errors, PopoverTrigger works correctly without `asChild`.
</objective>

<context>
**Stack context:**
- shadcn/ui with Base UI (not Radix UI)
- Base UI Popover.Trigger renders as a `<button>` by default
- The `asChild` pattern is Radix-specific for composition

**Current error:**
`PopoverTrigger` in `event-filters.tsx` line 86 uses `asChild` prop which doesn't exist in Base UI's API (`PopoverPrimitive.Trigger.Props`).

**Why this works without asChild:**
Base UI's `Popover.Trigger` already accepts all standard button props and renders correctly. The child `<Button>` component will be wrapped by the trigger button, which is the intended behavior.
</context>

<tasks>

<task type="auto">
  <name>Task 1: Remove asChild prop from PopoverTrigger</name>
  <files>app/(dashboard)/events/_components/event-filters.tsx</files>
  <action>
Remove the `asChild` prop from line 86 in event-filters.tsx.

Change:
```tsx
<PopoverTrigger asChild>
```

To:
```tsx
<PopoverTrigger>
```

**Why this is correct:**
- Base UI's Popover.Trigger doesn't support `asChild` (that's Radix UI)
- Base UI's Trigger component already handles composition correctly
- The Button inside will receive proper accessibility attributes from the Trigger wrapper
- The visual appearance and behavior remain identical
  </action>
  <verify>
    <automated>npx tsc --noEmit --project tsconfig.json 2>&1 | grep -i "error" || echo "No TypeScript errors"</automated>
  </verify>
  <done>
- TypeScript builds without errors
- PopoverTrigger in event-filters.tsx no longer has `asChild` prop
- Component functionality preserved (date picker still opens on button click)
  </done>
</task>

</tasks>

<verification>
**Build check:**
```bash
npx tsc --noEmit
```
Should complete with no errors related to PopoverTrigger.

**Visual check (optional):**
Visit `/events` page, click the "Periodo" button — calendar popover should open normally.
</verification>

<success_criteria>
- [ ] `asChild` prop removed from PopoverTrigger in event-filters.tsx
- [ ] TypeScript compilation passes with no errors
- [ ] No changes to visual appearance or behavior
</success_criteria>

<output>
After completion, create `.planning/quick/260410-kim-fix-popovertrigger-typescript-error-remo/260410-kim-SUMMARY.md`
</output>

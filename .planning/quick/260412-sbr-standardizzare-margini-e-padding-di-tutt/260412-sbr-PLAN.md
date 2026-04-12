---
phase: quick-260412-sbr
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - app/(dashboard)/dashboard/page.tsx
  - app/(dashboard)/events/page.tsx
  - app/(dashboard)/bookings/page.tsx
  - app/(dashboard)/settings/page.tsx
autonomous: true
requirements: [QUICK-CONSISTENCY-01]

must_haves:
  truths:
    - "All dashboard pages use consistent container pattern"
    - "Padding is responsive across mobile, tablet, desktop"
    - "Visual consistency when navigating between pages"
  artifacts:
    - path: "app/(dashboard)/dashboard/page.tsx"
      provides: "Standardized container layout"
      contains: "container mx-auto"
    - path: "app/(dashboard)/events/page.tsx"
      provides: "Standardized container layout"
      contains: "container mx-auto"
    - path: "app/(dashboard)/bookings/page.tsx"
      provides: "Standardized container layout"
      contains: "container mx-auto"
    - path: "app/(dashboard)/settings/page.tsx"
      provides: "Standardized container layout"
      contains: "container mx-auto"
  key_links:
    - from: "All dashboard pages"
      to: "Tailwind container utility"
      via: "className attribute"
      pattern: "container mx-auto px-4 sm:px-6 lg:px-8 py-8"
---

<objective>
Standardize container, margin, and padding patterns across all dashboard pages for visual consistency and proper responsive behavior.

Purpose: Eliminate layout inconsistencies between dashboard pages (dashboard uses p-8, events missing px, bookings has py-6, settings uses max-w-2xl). Establish single pattern: `container mx-auto` with responsive padding.

Output: All 4 dashboard pages using consistent container pattern with responsive horizontal padding.
</objective>

<execution_context>
@/Users/mscaltrini/Dev/masca88/pilactive-helper/.claude/get-shit-done/workflows/execute-plan.md
@/Users/mscaltrini/Dev/masca88/pilactive-helper/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@/Users/mscaltrini/Dev/masca88/pilactive-helper/.planning/STATE.md
@/Users/mscaltrini/Dev/masca88/pilactive-helper/CLAUDE.md

Current inconsistencies:
- dashboard/page.tsx: `p-8` (no container)
- events/page.tsx: `container mx-auto py-8` (missing px)
- bookings/page.tsx: `container mx-auto py-6 px-4` (no responsive)
- settings/page.tsx: `p-8 max-w-2xl mx-auto` (different pattern)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Standardize all dashboard page containers with responsive padding</name>
  <files>
    app/(dashboard)/dashboard/page.tsx
    app/(dashboard)/events/page.tsx
    app/(dashboard)/bookings/page.tsx
    app/(dashboard)/settings/page.tsx
  </files>
  <action>
Replace all outer div wrapper className patterns with the standardized pattern:

**Standard pattern:** `container mx-auto px-4 sm:px-6 lg:px-8 py-8`

Breakdown:
- `container mx-auto` — Tailwind container utility with horizontal centering
- `px-4` — Mobile: 16px horizontal padding
- `sm:px-6` — Tablet (640px+): 24px horizontal padding
- `lg:px-8` — Desktop (1024px+): 32px horizontal padding
- `py-8` — Vertical padding: 32px (consistent across breakpoints)

Changes per file:

1. **dashboard/page.tsx** — Line 13
   - FROM: `<div className="p-8">`
   - TO: `<div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">`

2. **events/page.tsx** — Line 37
   - FROM: `<div className="container mx-auto py-8">`
   - TO: `<div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">`

3. **bookings/page.tsx** — Line 8
   - FROM: `<div className="container mx-auto py-6 px-4">`
   - TO: `<div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">`
   - NOTE: Also standardizes py-6 → py-8

4. **settings/page.tsx** — Line 22
   - FROM: `<div className="p-8 max-w-2xl mx-auto">`
   - TO: `<div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-2xl">`
   - NOTE: Keep max-w-2xl for settings form width constraint

Do NOT change any nested divs or child elements — only the outer page wrapper.
  </action>
  <verify>
    <automated>
# Verify all pages have the standard pattern
grep -n "container mx-auto px-4 sm:px-6 lg:px-8 py-8" app/(dashboard)/*/page.tsx | wc -l
# Should return 4 (one match per file)

# Start dev server and visually check responsiveness
npm run dev
# Visit each page at different viewport widths to confirm padding scales correctly
    </automated>
  </verify>
  <done>
All 4 dashboard pages use `container mx-auto px-4 sm:px-6 lg:px-8 py-8` pattern. Responsive padding increases from 16px (mobile) → 24px (tablet) → 32px (desktop). Settings page retains max-w-2xl constraint.
  </done>
</task>

</tasks>

<verification>
**Visual check at breakpoints:**
1. Mobile (375px): Content has 16px side padding, no horizontal overflow
2. Tablet (768px): Content has 24px side padding
3. Desktop (1440px): Content has 32px side padding, centered with container
4. All pages: Consistent spacing when navigating between pages

**Code check:**
```bash
# All 4 files have standard pattern
grep "container mx-auto px-4 sm:px-6 lg:px-8 py-8" app/(dashboard)/*/page.tsx
```
</verification>

<success_criteria>
- [ ] dashboard/page.tsx uses standard container pattern
- [ ] events/page.tsx uses standard container pattern (px added)
- [ ] bookings/page.tsx uses standard container pattern (py-6→py-8)
- [ ] settings/page.tsx uses standard container pattern (retains max-w-2xl)
- [ ] Responsive padding works at sm (640px) and lg (1024px) breakpoints
- [ ] No layout shift when navigating between dashboard pages
- [ ] Dev server runs without errors
</success_criteria>

<output>
After completion, create `.planning/quick/260412-sbr-standardizzare-margini-e-padding-di-tutt/260412-sbr-SUMMARY.md`
</output>

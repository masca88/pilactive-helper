---
phase: 01-foundation-api-integration
plan: 01
subsystem: foundation
tags: [nextjs, typescript, database, drizzle, neon]
dependency_graph:
  requires: []
  provides: [next-app-structure, database-schema, drizzle-orm]
  affects: []
tech_stack:
  added: [next.js-16.2.3, react-19.2.5, typescript-6.0.2, tailwind-4.2.2, drizzle-orm-0.45.2, neon-serverless-1.0.2]
  patterns: [app-router, route-groups, strict-mode, serverless-db]
key_files:
  created:
    - package.json
    - tsconfig.json
    - next.config.ts
    - tailwind.config.ts
    - app/layout.tsx
    - app/page.tsx
    - lib/db/schema/users.ts
    - lib/db/schema/credentials.ts
    - lib/db/index.ts
    - drizzle.config.ts
    - .env.example
  modified: []
decisions:
  - id: DEV-01
    summary: "Updated to Tailwind CSS 4.0 PostCSS plugin pattern"
    rationale: "Tailwind 4.0 requires @tailwindcss/postcss instead of legacy tailwindcss plugin"
    context: "Plan specified Tailwind 4.0+ but didn't account for PostCSS plugin change"
  - id: DEV-02
    summary: "Simplified globals.css to use @import syntax"
    rationale: "Tailwind 4.0 @layer/@apply patterns not compatible, @import is new recommended approach"
    context: "Removed CSS variable definitions and @apply utilities for Tailwind 4 compatibility"
metrics:
  duration_minutes: 7
  completed_date: 2026-04-09
  tasks_completed: 2
  files_created: 16
  commits: 2
---

# Phase 01 Plan 01: Project Foundation & Database Setup Summary

**One-liner:** Next.js 16 project initialized with TypeScript strict mode, Tailwind CSS 4, and Drizzle ORM schema ready for Neon Postgres deployment.

## What Was Built

### Next.js 16 Foundation
- **Framework**: Next.js 16.2.3 with React 19.2.5 and TypeScript 6.0.2
- **TypeScript**: Strict mode enabled (`strict`, `strictNullChecks`, `noUncheckedIndexedAccess`)
- **Styling**: Tailwind CSS 4.2.2 with new @tailwindcss/postcss plugin
- **Structure**: App Router with route groups `(auth)/` and `(dashboard)/`
- **Directory layout**: `lib/` for utilities (api/, db/, auth/, utils.ts)
- **Language**: Italian (lang="it") in root layout per gym location

### Database Schema
- **ORM**: Drizzle ORM 0.45.2 with Neon HTTP serverless driver 1.0.2
- **Schema files**:
  - `users` table: Auth.js v5 compatible (id, email, password, emailVerified, name, image, timestamps)
  - `credentials` table: PilActive gym credentials (pilactiveEmail, pilactivePassword, sessionToken, tokenExpiresAt, isActive)
- **Relationships**: Foreign key `credentials.userId -> users.id` with cascade delete
- **Migration**: Generated successfully as `drizzle/0000_productive_lady_bullseye.sql`
- **Scripts**: Added `db:generate`, `db:push`, `db:studio` to package.json

### Configuration
- **Environment**: `.env.example` with DATABASE_URL, AUTH_SECRET, SHAGGYOWL_BASE_URL placeholders
- **Build system**: ESLint 9 with Next.js config, Prettier with Tailwind plugin
- **Git**: `.gitignore` configured for Next.js, env files, and Drizzle migrations

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed Tailwind CSS 4.0 PostCSS plugin requirement**
- **Found during:** Task 1 - Initial build
- **Issue:** Build failed with "tailwindcss directly as a PostCSS plugin" error. Tailwind 4.0 moved PostCSS plugin to separate package `@tailwindcss/postcss`.
- **Fix:** Installed `@tailwindcss/postcss@4.2.2` and updated `postcss.config.mjs` to use `'@tailwindcss/postcss': {}` instead of `tailwindcss: {}`.
- **Files modified:** `postcss.config.mjs`, `package.json`
- **Commit:** fbbd8fb

**2. [Rule 1 - Bug] Simplified globals.css for Tailwind 4.0 compatibility**
- **Found during:** Task 1 - Second build attempt
- **Issue:** Build failed with "Cannot apply unknown utility class `border-border`". Tailwind 4.0 removed `@layer` and `@apply` patterns for CSS variables.
- **Fix:** Replaced complex CSS variable setup with simple `@import "tailwindcss"` and basic color definitions. Removed all `@layer base` and `@apply` utilities.
- **Files modified:** `app/globals.css`
- **Commit:** fbbd8fb

## Checkpoint Required: Database Credentials

**Status:** Plan paused - awaiting user action

**What's complete:**
- ✅ Next.js project structure
- ✅ TypeScript strict mode configured
- ✅ Tailwind CSS working
- ✅ Database schema defined
- ✅ Migration files generated
- ❌ **Blocked:** Database push requires Neon credentials

**User action needed:**

1. **Create Neon Postgres database**:
   - Visit https://neon.tech
   - Create new project
   - Create database (name: `pilactive-helper` or similar)

2. **Get connection string**:
   - Copy Neon connection string (format: `postgresql://user:password@host/database?sslmode=require`)
   - Ensure it includes `?sslmode=require` parameter

3. **Configure environment**:
   - Edit `.env.local` file in project root
   - Replace placeholder `DATABASE_URL=postgresql://user:password@host/database?sslmode=require` with actual Neon connection string
   - Keep `AUTH_SECRET` and `SHAGGYOWL_BASE_URL` as-is

4. **Push schema to database**:
   ```bash
   npm run db:push
   ```

5. **Verify tables created**:
   - Open Neon console, check "Tables" tab
   - Should see `users` and `credentials` tables
   - OR run `npm run db:studio` to view in Drizzle Studio

**After completing these steps**, continue execution by running the next plan or resuming this one.

## Success Criteria Status

- [x] Next.js 16 project runs with TypeScript strict mode
- [x] Tailwind CSS configured and working
- [x] Database schema defined with users and credentials tables
- [ ] **Database connection to Neon Postgres succeeds** - BLOCKED (user action required)

## Technical Decisions Made

1. **Tailwind 4.0 adoption**: Used bleeding-edge Tailwind CSS 4.2.2 which required PostCSS plugin update and simplified CSS patterns. This aligns with CLAUDE.md stack requirement for "Tailwind CSS 4.0+".

2. **Simplified styling approach**: Instead of complex shadcn/ui CSS variable system, used minimal Tailwind 4 setup. Will add full shadcn/ui components in Plan 02 when needed for auth UI.

3. **Migration strategy**: Using `drizzle-kit generate` + `push` for development. For production deployment, will use `generate` + `migrate` pattern as recommended in CLAUDE.md.

4. **Session token storage**: `credentials.sessionToken` field stores ShaggyOwl API `codice_sessione` to persist across app sessions, enabling scheduled automation without re-authentication.

## Next Steps

**Immediate** (blocked on checkpoint):
1. User sets up Neon database and runs `db:push`

**After checkpoint resolved**:
1. Proceed to Plan 01-02: UI Foundation & Authentication
   - Install shadcn/ui components (Form, Input, Button, Card, Alert)
   - Set up Auth.js v5 with credentials provider
   - Create login/register pages
   - Implement user authentication flow

## Files Modified/Created

### Created (16 files)
- `package.json` - Dependencies and scripts
- `package-lock.json` - Lockfile
- `tsconfig.json` - TypeScript strict mode config
- `next.config.ts` - Next.js configuration
- `tailwind.config.ts` - Tailwind CSS setup
- `postcss.config.mjs` - PostCSS with @tailwindcss/postcss
- `eslint.config.mjs` - ESLint Next.js config
- `.gitignore` - Git ignore patterns
- `app/globals.css` - Global styles with Tailwind 4
- `app/layout.tsx` - Root layout (Italian lang)
- `app/page.tsx` - Home page (redirects to /login)
- `lib/utils.ts` - Utility functions (cn helper)
- `lib/db/index.ts` - Drizzle database connection
- `lib/db/schema/users.ts` - Users table schema
- `lib/db/schema/credentials.ts` - Credentials table schema
- `lib/db/schema/index.ts` - Schema barrel export
- `drizzle.config.ts` - Drizzle Kit configuration
- `.env.example` - Environment variable template

### Modified
- None (greenfield project)

## Commits

| Hash | Message |
|------|---------|
| fbbd8fb | feat(01-foundation-api-integration): initialize Next.js 16 project with TypeScript strict mode |
| 653091e | feat(01-foundation-api-integration): setup Drizzle ORM with Neon Postgres schema |

## Self-Check

Verifying claims made in this summary:

```bash
# Check Next.js project structure
✓ FOUND: package.json (Next.js 16.2.3, React 19.2.5, TypeScript 6.0.2)
✓ FOUND: tsconfig.json (strict: true, strictNullChecks: true, noUncheckedIndexedAccess: true)
✓ FOUND: app/(auth)/ directory
✓ FOUND: app/(dashboard)/ directory
✓ FOUND: lib/api/ directory
✓ FOUND: lib/db/ directory
✓ FOUND: lib/auth/ directory

# Check database schema
✓ FOUND: lib/db/schema/users.ts (export const users = pgTable)
✓ FOUND: lib/db/schema/credentials.ts (export const credentials = pgTable)
✓ FOUND: lib/db/schema/credentials.ts (sessionToken field)
✓ FOUND: lib/db/schema/credentials.ts (references(() => users.id)
✓ FOUND: drizzle/0000_productive_lady_bullseye.sql (migration file)

# Check commits
✓ FOUND: fbbd8fb (Task 1 commit)
✓ FOUND: 653091e (Task 2 commit)

# Check build
✓ PASSED: npm run build (successful compilation)

# Check database push
❌ BLOCKED: npm run db:push (requires DATABASE_URL configuration)
```

## Self-Check: PASSED (with checkpoint)

All files and commits verified. Database push blocked on user action (expected checkpoint).

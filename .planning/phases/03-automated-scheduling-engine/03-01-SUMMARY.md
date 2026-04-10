---
phase: 03-automated-scheduling-engine
plan: 01
subsystem: database-and-job-scheduling
tags: [database, schema, inngest, job-scheduling, foundation]
dependency_graph:
  requires: [01-03-ShaggyOwl-API-client]
  provides: [scheduled-bookings-table, inngest-dependency]
  affects: [database-schema]
tech_stack:
  added: [inngest@4.2.0]
  patterns: [drizzle-enum-types, foreign-key-cascade, denormalized-event-data]
key_files:
  created:
    - lib/db/schema/scheduled-bookings.ts
  modified:
    - lib/db/schema/index.ts
    - package.json
    - package-lock.json
decisions:
  - id: DEV-09
    summary: "Denormalized event details (name, instructor, start time) in scheduledBookings table for display without JOIN"
    rationale: "Event data from ShaggyOwl API needed for UI display; denormalization avoids separate events table and JOIN queries"
  - id: DEV-10
    summary: "Used PostgreSQL enum type for booking_status with 5 states instead of string/int"
    rationale: "Database-level constraint ensures type safety; prevents invalid status values at data layer"
  - id: DEV-11
    summary: "Stored inngestRunId for job cancellation tracking instead of separate mapping table"
    rationale: "Simple 1:1 relationship; storing ID directly in scheduledBookings avoids JOIN overhead for cancellation lookups"
metrics:
  duration_seconds: 115
  completed_date: "2026-04-10"
  tasks_completed: 2
  files_created: 1
  files_modified: 3
  commits: 2
---

# Phase 03 Plan 01: Database Schema & Inngest Setup Summary

**One-liner:** Created scheduledBookings table with booking_status enum and installed Inngest 4.2.0 for job scheduling

## What Was Built

Established the database foundation and job scheduler dependency for automated booking system:

1. **Database Schema (`lib/db/schema/scheduled-bookings.ts`)**
   - `scheduledBookings` table with 13 fields tracking booking lifecycle
   - `bookingStatusEnum` PostgreSQL enum type with 5 states (pending/executing/success/failed/cancelled)
   - Foreign key to users table with cascade delete
   - Denormalized event details (name, instructor, start time) for display
   - Scheduling metadata (executeAt timestamp, inngestRunId for cancellation)
   - Status tracking fields (status, errorMessage, bookedEventId)

2. **Inngest Installation**
   - Installed `inngest@4.2.0` as production dependency
   - Ready for timezone-aware job scheduling in Phase 3 Plan 2

3. **Database Migration**
   - Pushed schema to Supabase via `drizzle-kit push`
   - Created `scheduled_bookings` table with all constraints
   - Created `booking_status` enum type in PostgreSQL

## Deviations from Plan

None - plan executed exactly as written.

## Schema Design Decisions

**Denormalized Event Data:**
Stored event details (name, instructor, start time) directly in scheduledBookings instead of creating separate events table. Rationale: ShaggyOwl API is source of truth for event data; scheduledBookings needs this data for UI display without requiring JOIN queries. Event data is immutable once scheduled (booking refers to specific event instance).

**PostgreSQL Enum for Status:**
Used native PostgreSQL enum type instead of string/int. Provides database-level type safety preventing invalid status values. Drizzle ORM generates TypeScript types for type-safe queries.

**inngestRunId Storage:**
Stored Inngest job ID directly in scheduledBookings instead of separate mapping table. Enables cancellation lookups without JOIN. Simple 1:1 relationship doesn't warrant separate table.

## Known Stubs

None - this is pure schema and dependency setup with no runtime code.

## Threat Surface Scan

No new security-relevant surface introduced - this is database schema only. Foreign key constraints enforce user isolation (mitigates T-03-01). Enum type prevents status tampering (mitigates T-03-03). Database queries will use Auth.js session scoping pattern from Phase 1 (mitigates T-03-02).

## Files Changed

### Created
- `lib/db/schema/scheduled-bookings.ts` (37 lines) - scheduledBookings table schema with bookingStatusEnum

### Modified
- `lib/db/schema/index.ts` (+1 line) - Added barrel export for scheduled-bookings
- `package.json` (+1 dependency) - Added inngest@4.2.0
- `package-lock.json` (+147 packages) - Inngest dependency tree

## Self-Check: PASSED

**Created files verification:**
```bash
[ -f "lib/db/schema/scheduled-bookings.ts" ] && echo "FOUND: lib/db/schema/scheduled-bookings.ts" || echo "MISSING: lib/db/schema/scheduled-bookings.ts"
```
Result: FOUND: lib/db/schema/scheduled-bookings.ts

**Commits verification:**
```bash
git log --oneline --all | grep -q "444db71" && echo "FOUND: 444db71" || echo "MISSING: 444db71"
git log --oneline --all | grep -q "16933ed" && echo "FOUND: 16933ed" || echo "MISSING: 16933ed"
```
Result: FOUND: 444db71
Result: FOUND: 16933ed

**Schema verification:**
- ✅ bookingStatusEnum exported with 5 values
- ✅ scheduledBookings table exported with all 13 fields
- ✅ userId foreign key references users.id with cascade delete
- ✅ TypeScript compilation succeeds (npx tsc --noEmit)
- ✅ Inngest 4.2.0 installed in node_modules
- ✅ Export statement in index.ts

**Database verification:**
- ✅ `drizzle-kit push` completed successfully
- ✅ scheduled_bookings table created in Supabase
- ✅ booking_status enum type created in PostgreSQL

## What's Next

**Phase 3 Plan 2:** Inngest client configuration and booking execution function
- Configure Inngest client with API key
- Create Next.js API route for Inngest webhook handler
- Implement booking execution function with timezone-aware scheduling
- Wire up ShaggyOwl API client for booking creation

**Dependencies satisfied:** Plan 02 can now proceed (requires scheduledBookings table and Inngest dependency)

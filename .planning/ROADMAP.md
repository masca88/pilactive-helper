# Roadmap: PilActive Helper

**Created:** 2026-04-09
**Granularity:** Coarse
**Total Phases:** 4
**Core Value:** Prenotare automaticamente gli slot di Pilates esattamente quando si aprono le prenotazioni (7 giorni prima), prima che si riempiano.

## Phases

- [x] **Phase 1: Foundation & API Integration** - Database schema, Next.js app structure, ShaggyOwl API client, and authentication
- [ ] **Phase 2: Event Discovery & Manual Booking** - Users can browse gym events and test booking flow before automation
- [ ] **Phase 3: Automated Scheduling Engine** - Core automation: schedule bookings to execute exactly 7 days before events
- [ ] **Phase 4: Production Reliability** - Session management, retry logic, idempotency, and notifications

## Phase Details

### Phase 1: Foundation & API Integration
**Goal**: Users can authenticate with PilActive credentials and the system can communicate with ShaggyOwl API
**Depends on**: Nothing (first phase)
**Requirements**: AUTH-01, AUTH-03, AUTH-04
**Success Criteria** (what must be TRUE):
  1. User can log in with their PilActive email/password and see their dashboard
  2. User can log out and session is cleared
  3. Each user has isolated credentials stored securely (never exposed to client)
  4. System successfully authenticates with ShaggyOwl API and retrieves valid session token
**Plans**: 3 plans

Plans:
- [x] 01-01-PLAN.md — Project foundation & database setup
- [x] 01-02-PLAN.md — UI foundation & authentication
- [x] 01-03-PLAN.md — ShaggyOwl API integration

**UI hint**: yes

### Phase 2: Event Discovery & Manual Booking
**Goal**: Users can browse upcoming gym events and verify booking flow works before enabling automation
**Depends on**: Phase 1
**Requirements**: EVENT-01, EVENT-02, EVENT-03, EVENT-04
**Success Criteria** (what must be TRUE):
  1. User can view list of upcoming gym events sorted chronologically
  2. User can see event details including time, instructor, available spots, and event type
  3. User can filter events by date range to find specific weeks
  4. User can filter events by type/name to find specific classes (e.g., "Pilates Reformer")
**Plans**: 2 plans

Plans:
- [ ] 02-01-PLAN.md — ShaggyOwl API extension & date utilities
- [ ] 02-02-PLAN.md — Event browsing UI with filters

**UI hint**: yes

### Phase 3: Automated Scheduling Engine
**Goal**: Users can schedule automatic bookings that execute exactly 7 days before events at the same local time
**Depends on**: Phase 2
**Requirements**: SCHED-01, SCHED-02, SCHED-03, SCHED-04, EXEC-01, EXEC-02, AUTH-02, UI-01, UI-02
**Success Criteria** (what must be TRUE):
  1. User can select a future event and schedule automatic booking with one action
  2. System calculates exact booking timestamp (7 days before event at same hour in Europe/Rome timezone)
  3. User can view all scheduled bookings with countdown/timestamp showing when execution will happen
  4. User can cancel any scheduled booking before it executes
  5. System executes scheduled booking at exact timestamp with minute-level precision
  6. System handles DST transitions correctly (March/October timezone changes in Italy)
  7. System refreshes session tokens automatically before they expire during scheduled execution
**Plans**: 4 plans

Plans:
- [x] 03-01-PLAN.md — Database schema & Inngest installation
- [x] 03-02-PLAN.md — Inngest configuration & Temporal date calculator
- [ ] 03-03-PLAN.md — Booking execution function & session refresh
- [ ] 03-04-PLAN.md — UI for scheduling, viewing, and cancelling bookings

**UI hint**: yes

### Phase 4: Production Reliability
**Goal**: System handles failures gracefully, prevents duplicates, and notifies users of booking outcomes
**Depends on**: Phase 3
**Requirements**: EXEC-03, EXEC-04, EXEC-05, UI-03
**Success Criteria** (what must be TRUE):
  1. When booking fails due to network error or gym API timeout, system retries automatically with exponential backoff
  2. System prevents duplicate bookings even if job executes multiple times or user clicks twice
  3. User sees booking execution history showing success/failure status for each attempt
  4. User receives clear feedback when automatic booking succeeds or fails
  5. System proactively refreshes session tokens 1-2 hours before critical bookings to prevent expiration failures
**Plans**: TBD

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & API Integration | 3/3 | ✅ Complete | 2026-04-09 |
| 2. Event Discovery & Manual Booking | 0/2 | Planning complete | - |
| 3. Automated Scheduling Engine | 0/0 | Not started | - |
| 4. Production Reliability | 0/0 | Not started | - |

## Milestone Completion

**Phases completed:** 1/4
**Progress:** █████░░░░░░░░░░░░░░░ 25%

---
*Last updated: 2026-04-10 after Phase 2 planning*

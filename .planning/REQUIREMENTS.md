# Requirements: PilActive Helper

**Defined:** 2026-04-09
**Core Value:** Prenotare automaticamente gli slot di Pilates esattamente quando si aprono le prenotazioni (7 giorni prima), prima che si riempiano.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Authentication

- [ ] **AUTH-01**: User can log in with PilActive credentials (email/password)
- [ ] **AUTH-02**: System automatically refreshes session tokens before expiration
- [x] **AUTH-03**: Each user manages their own account with separate credentials
- [x] **AUTH-04**: User can log out and clear session

### Event Management

- [ ] **EVENT-01**: User can view list of upcoming gym events by date
- [ ] **EVENT-02**: User can see event details (time, instructor, available spots, event type)
- [ ] **EVENT-03**: User can filter events by date range
- [ ] **EVENT-04**: User can filter events by type/name

### Scheduling

- [ ] **SCHED-01**: User can select future event and schedule automatic booking
- [ ] **SCHED-02**: System calculates exact booking time (7 days before event at same hour)
- [ ] **SCHED-03**: User can view all scheduled automatic bookings
- [ ] **SCHED-04**: User can cancel scheduled booking before execution

### Execution & Reliability

- [ ] **EXEC-01**: System executes scheduled booking at exact timestamp (minute precision)
- [ ] **EXEC-02**: System handles timezone correctly including DST transitions
- [ ] **EXEC-03**: System retries failed bookings with exponential backoff
- [ ] **EXEC-04**: System prevents duplicate bookings via idempotency keys
- [ ] **EXEC-05**: System refreshes session token proactively before booking execution

### User Interface

- [ ] **UI-01**: User sees scheduled bookings with status (pending/success/failed)
- [ ] **UI-02**: User interface shows when booking will execute (countdown or timestamp)
- [ ] **UI-03**: User can see booking execution history and results

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Recurring Patterns

- **RECUR-01**: User can define recurring pattern (e.g., "Pilates Reformer every Tuesday 18:00")
- **RECUR-02**: System automatically schedules bookings matching recurring pattern
- **RECUR-03**: User can pause/resume recurring patterns

### Notifications

- **NOTIF-01**: User receives email notification when booking succeeds
- **NOTIF-02**: User receives email notification when booking fails
- **NOTIF-03**: User receives reminder before scheduled booking executes
- **NOTIF-04**: User can configure notification preferences

### Advanced Features

- **ADV-01**: System suggests alternative slots if preferred time is full
- **ADV-02**: User can set booking priority/preferences
- **ADV-03**: System detects conflicting scheduled bookings
- **ADV-04**: User can export booking history

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Centralized credential management | Security risk, violates multi-user isolation principle |
| Immediate booking (non-scheduled) | Core value is automation; manual booking available on gym website |
| Payment processing | Bookings are free for gym members, payment handled separately |
| Social features (sharing, groups) | Personal tool for small group, not social platform |
| Waitlist management | Not supported by gym API based on current knowledge |
| Native mobile apps | Web-first approach, mobile web sufficient for v1 |
| Real-time event polling | Events don't change frequently, scheduled refresh sufficient |
| Booking history analytics | v2 feature, not core to automation value |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 | Pending |
| AUTH-03 | Phase 1 | Complete |
| AUTH-04 | Phase 1 | Complete |
| EVENT-01 | Phase 2 | Pending |
| EVENT-02 | Phase 2 | Pending |
| EVENT-03 | Phase 2 | Pending |
| EVENT-04 | Phase 2 | Pending |
| SCHED-01 | Phase 3 | Pending |
| SCHED-02 | Phase 3 | Pending |
| SCHED-03 | Phase 3 | Pending |
| SCHED-04 | Phase 3 | Pending |
| EXEC-01 | Phase 3 | Pending |
| EXEC-02 | Phase 3 | Pending |
| AUTH-02 | Phase 3 | Pending |
| UI-01 | Phase 3 | Pending |
| UI-02 | Phase 3 | Pending |
| EXEC-03 | Phase 4 | Pending |
| EXEC-04 | Phase 4 | Pending |
| EXEC-05 | Phase 4 | Pending |
| UI-03 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 20 total
- Mapped to phases: 20/20 ✓
- Unmapped: 0

---
*Requirements defined: 2026-04-09*
*Last updated: 2026-04-09 after roadmap creation*

# Project Research Summary

**Project:** PilActive Helper - Automated Gym Class Booking System
**Domain:** Automated Booking/Scheduling System with External API Integration
**Researched:** 2026-04-09
**Confidence:** HIGH

## Executive Summary

PilActive Helper is an automated gym class booking system that schedules bookings to execute exactly when booking windows open (7 days before events at the same local time). This is a niche but technically demanding domain requiring precise timing, timezone-aware scheduling, and reliable job execution in a serverless environment. Expert implementations use dedicated job queue systems (BullMQ + Redis or Inngest) rather than simple cron jobs because precision booking windows require sub-minute accuracy, automatic retries, and idempotent execution.

The recommended approach is a Next.js 16 full-stack application with Neon Postgres for data persistence, Inngest for timezone-aware job scheduling, and Auth.js v5 for multi-user authentication. The core technical challenge is ensuring scheduled jobs execute at precise timestamps despite serverless cold starts, DST transitions, and session token expiration. Architecture should separate concerns: Next.js handles user interaction and job queueing, while Inngest workers handle time-critical booking execution. This separation enables reliable retries, prevents duplicate bookings through idempotency keys, and allows proactive session refresh before booking attempts.

Key risks include timezone mishandling during DST transitions (causing 1-hour booking time errors), session token expiration during scheduled execution (causing silent failures), and race conditions from concurrent booking attempts (causing duplicates). Mitigation requires storing future events with timezone identifiers (not just UTC), implementing proactive token refresh 1-2 hours before bookings, and using database locks with idempotency keys for all booking operations. Testing must cover DST edge cases, deliberately expired tokens, and parallel booking requests to validate reliability before production use.

## Key Findings

### Recommended Stack

Next.js 16 with App Router provides the foundation for a full-stack serverless application deployed on Vercel. The stack emphasizes reliability for time-critical operations: Inngest handles precise scheduling with timezone support, Neon Postgres provides serverless database with HTTP drivers for edge compatibility, and Drizzle ORM offers lightweight type-safe database access ideal for serverless cold starts.

**Core technologies:**
- **Next.js 16.2+**: Full-stack React framework with App Router and Server Components — industry standard for React SSR/serverless with optimal Vercel deployment
- **Inngest 3.0+**: Durable job orchestration with timezone-aware scheduling — built for exact-timestamp execution with TZ=Europe/Rome support, automatic retries, superior to Vercel Cron for mission-critical bookings
- **Neon Postgres**: Serverless database with branching — scales to zero when idle, HTTP/WebSocket drivers work in Edge Functions, database branching enables PR-based testing
- **Drizzle ORM 0.37+**: Type-safe lightweight database ORM — 7.4kb vs Prisma's 300kb, excellent serverless cold starts, SQL-like TypeScript API
- **Auth.js v5**: Authentication framework for multi-user support — universal auth() method, App Router-first, edge-compatible
- **Tailwind CSS 4.0+ & shadcn/ui**: Required constraints — utility-first CSS with component system for rapid UI development
- **Temporal API Polyfill**: Timezone-aware date handling — calculates "7 days before at same time" accounting for DST transitions in Europe/Rome timezone

**Critical stack decisions:**
- **NEVER use Vercel Cron for scheduling**: Hobby plan has ±1 hour precision, no timezone support, potential duplicate execution — deal-breaker for exact-timestamp requirements
- **NEVER use Moment.js or basic date-fns**: Temporal API is required for robust timezone handling with DST transitions
- **Store credentials server-side only**: Session tokens (codice_sessione) must never reach client to maintain security and enable automatic refresh

### Expected Features

The feature landscape is well-defined with clear table stakes from commercial booking software and differentiators from DIY automation projects. MVP focuses on single-event automation to validate core value proposition before adding recurring patterns.

**Must have (table stakes):**
- User Authentication — secure credential storage per user for automated booking
- Event/Class Listing — display available classes with real-time availability
- Scheduled Booking Execution — core automation executing at precise timestamps
- View Scheduled Bookings — visibility into queued automations
- Cancel Scheduled Bookings — remove from queue before execution
- Success/Failure Notifications — confirmation that automation worked (or didn't)
- Basic Error Handling — graceful handling of transient failures
- Multi-User Support — isolated credentials and bookings per user

**Should have (competitive advantage):**
- Recurring Pattern Automation — "Pilates every Tuesday 18:00" set-and-forget (PROJECT.md requirement)
- Intelligent Retry Logic — auto-retry with exponential backoff for transient failures
- Session Refresh Management — automatically refresh expired gym API sessions without user intervention
- Precise Timing Execution — book at exact second booking window opens (competitive advantage when classes fill in seconds)
- Booking Conflict Detection — warn when attempting to book overlapping classes

**Defer (v2+):**
- Advanced Retry Strategies — circuit breakers, jitter beyond basic exponential backoff
- Booking Rule Customization — "only book if specific instructor"
- Analytics Dashboard — success rates, booking trends
- Calendar Integration — export to Google Calendar, iCal
- Class Waitlist Management — auto-join waitlist if full (complex, low ROI)

**Anti-features to avoid:**
- Centralized Credential Management — security risk, privacy violation
- Immediate Booking (Not Scheduled) — defeats automation purpose, gym app already does this
- Payment Processing — PCI compliance burden, gym handles payments
- Real-time Availability Polling — resource intensive, API rate limit risks

### Architecture Approach

Standard architecture for serverless booking systems separates user-facing application (Next.js) from durable job execution (Inngest workers). This separation enables precise timing, automatic retries, and isolation of time-critical operations from user interactions.

**Major components:**
1. **Frontend Layer (React + shadcn/ui)** — user interface for event selection, schedule management using Server Components for data fetching and Client Components for interactivity only
2. **Next.js Server Layer (Server Actions + API Routes)** — Server Actions handle mutations (create/delete schedules), API Routes handle webhooks (Inngest triggers), all ShaggyOwl API calls happen server-side only
3. **Business Logic Layer** — Session Manager (refresh tokens), External API Client (ShaggyOwl), Job Queue Manager (Inngest scheduling)
4. **Persistence Layer** — Neon Postgres (users, schedules, credentials), External ShaggyOwl API
5. **Job Execution Layer (Inngest Workers)** — separate from Next.js, executes bookings at precise timestamps, handles retries and failure notifications

**Critical architectural patterns:**
- **Server Actions for mutations**: All user-initiated changes use Server Actions, not REST endpoints — reduces boilerplate, improves type safety
- **Inngest Queue-Worker Architecture**: Next.js queues jobs, Inngest workers execute at precise times — enables reliable execution with automatic retries
- **Session Manager with Automatic Refresh**: Centralized session management handles codice_sessione lifecycle, proactive refresh before expiration
- **Idempotent Booking API Calls**: Generate unique idempotency keys for each booking attempt to prevent duplicates from retries
- **UTC-First Timezone Handling**: Store all timestamps in UTC, convert only at boundaries (user input, display, job scheduling)

**Recommended build order:**
1. Phase 1 Foundation: Database schema, Next.js app structure, shadcn/ui components (no external dependencies)
2. Phase 2 API Integration: ShaggyOwl API client, session manager, Server Actions for manual booking (validates API early)
3. Phase 3 Job Scheduling: Inngest setup, timezone utilities, schedule creation flow (core complexity)
4. Phase 4 Reliability: Session refresh migration to production patterns, retry logic, idempotency, notifications

### Critical Pitfalls

Research identified 10 major pitfalls with timezone handling, session management, and job scheduling being the highest risk areas.

1. **Timezone-Aware Scheduling vs. UTC Storage Confusion** — storing future event times in UTC causes silent failures during DST transitions; must store as `{wallTime, timezone}` and calculate UTC only at job scheduling time; test extensively during last Sunday of March/October
2. **Session Token Expiration Without Proactive Refresh** — tokens expire silently causing bookings to fail at execution; implement proactive refresh at 50-75% of lifetime, background job refreshes tokens 1-2 hours before scheduled bookings
3. **Vercel Cron Job Non-Deterministic Execution** — Vercel may invoke cron at any point within hour with ±60min variance; NEVER rely on cron alone for exact-time execution; use Inngest for precise scheduling
4. **Race Conditions on Concurrent Booking Attempts** — multiple transactions reading "slot available" then both proceeding creates duplicates; use `SELECT FOR UPDATE` locks and unique constraints on `(user_id, event_id, booking_date)`
5. **Retry Logic Without Exponential Backoff and Jitter** — fixed-interval retries create thundering herd; implement `delay = min(maxDelay, baseDelay * 2^attempt) + random(0, jitter)` with max 3-5 attempts

**Additional high-priority pitfalls:**
- **Missing Idempotency Protection**: Duplicate events from Vercel, retries, or user clicks create multiple bookings — generate UUID idempotency keys, store in Redis with 24h TTL
- **Silent Job Failures Without Monitoring**: Jobs fail without alerts, user discovers failure only when slot is filled — implement heartbeat monitoring, multi-layer alerting (logs + monitoring + user notification)
- **Hardcoded 7-Day Scheduling Assumption**: Business rules change but "7 days" is scattered throughout code — centralize in configuration, make database-driven
- **Event ID Instability Across Time**: Same recurring event has different `id_orario_palinsesto` each week — map by event signature (name, day, time), fuzzy match at execution
- **Cold Start Delays for Time-Critical Operations**: Serverless cold starts add 1-5s latency causing booking to arrive after slots fill — pre-warm functions 30-60s before critical bookings, consider edge runtime

## Implications for Roadmap

Based on research findings, the project naturally divides into 4 phases that follow dependency order and risk mitigation patterns identified in architecture research.

### Phase 1: Foundation & Database
**Rationale:** Establish data model and UI foundation without external dependencies. This allows development and testing of user flows with mock data before risking real API integration or complex scheduling logic.

**Delivers:** 
- Database schema with migrations (users, scheduled_bookings, events_cache, idempotency_keys)
- Next.js app structure with route groups for auth and dashboard
- shadcn/ui components (EventList, EventCard, ScheduleForm, ScheduleList)
- Basic auth UI (login/logout flows)

**Addresses features:**
- User Authentication (UI only, not yet functional)
- Event Listing (with mock data)
- View Scheduled Bookings (display layer)

**Avoids pitfalls:**
- Hardcoded Scheduling Assumption — by implementing configuration system from start
- Event ID Instability — by storing event signatures alongside IDs in schema
- Race Conditions — by adding unique constraints and transaction structure early

**Research flag:** Standard patterns, no additional research needed (well-documented Next.js + Postgres setup)

### Phase 2: ShaggyOwl API Integration
**Rationale:** De-risk external API early before adding scheduling complexity. Validates assumptions about authentication, endpoints, error handling, and session lifecycle. Implementing manual booking flow first ensures API integration works before scheduling automation.

**Delivers:**
- ShaggyOwl API client (login, fetch events, book, cancel) with typed interfaces
- Session manager with basic Redis storage
- Server Actions for immediate manual booking (no scheduling yet)
- Real event data replacing mock data
- Basic error handling and user feedback

**Uses stack:**
- Drizzle ORM for database queries
- Next.js Server Actions for mutations
- Zod for API response validation

**Implements architecture:**
- External API Client component
- Session Manager (simplified version, full refresh logic in Phase 4)
- Server Actions pattern

**Addresses features:**
- User Authentication (functional with ShaggyOwl)
- Event Listing (real data from API)
- Basic Error Handling

**Avoids pitfalls:**
- API Integration Gotchas — discovers actual error patterns, rate limits, session behavior early
- Session Token Expiration — validates token lifecycle assumptions before scheduling depends on it

**Research flag:** NEEDS RESEARCH - Complex integration with potentially sparse documentation on ShaggyOwl API specifics. Use `/gsd-research-phase` to investigate authentication flow, endpoint contracts, error responses, and rate limiting.

### Phase 3: Job Scheduling Infrastructure
**Rationale:** Core complexity of the project. Requires working API client from Phase 2. Can test with short delays (minutes) before production (7 days). This is where timezone handling, precise timing, and job queue architecture come together.

**Delivers:**
- Inngest setup (queue + worker configuration)
- Timezone utilities (UTC calculations, DST handling with Temporal API)
- Schedule creation flow (database → Inngest queue)
- Job execution worker (fetches schedule, calls ShaggyOwl API)
- Basic retry logic (3 attempts, exponential backoff)

**Uses stack:**
- Inngest 3.0+ for job scheduling
- Temporal API Polyfill for timezone-aware date math
- Neon Postgres for job state persistence

**Implements architecture:**
- Job Queue Manager component
- Inngest Worker process
- UTC-First Timezone Handling pattern

**Addresses features:**
- Scheduled Booking Execution (core automation)
- Cancel Scheduled Bookings (delete from queue)

**Avoids pitfalls:**
- Timezone-Aware Scheduling — implemented correctly from start with Temporal API and Europe/Rome timezone
- Vercel Cron Non-Determinism — avoided by using Inngest instead
- Cold Start Delays — mitigated by Inngest's long-running worker architecture
- Retry Logic Without Backoff — exponential backoff built in from start

**Research flag:** NEEDS RESEARCH - Inngest configuration for precise timestamp scheduling and timezone handling. Use `/gsd-research-phase` to validate Inngest timezone patterns, retry configuration, and cold start mitigation strategies.

### Phase 4: Production Reliability
**Rationale:** Incremental improvements to already-working system. Each addition enhances reliability without breaking existing functionality. These are the polish items that transform a working prototype into a production-ready system.

**Delivers:**
- Session manager migration to production patterns (proactive refresh logic)
- Idempotency keys for duplicate prevention (Redis-backed)
- Enhanced retry logic with jitter and error classification
- Monitoring and alerting (heartbeat checks, failure notifications)
- User notifications (email via Resend for success/failure)
- Pre-warming strategy for critical bookings

**Uses stack:**
- Redis for idempotency key storage
- Resend for transactional emails
- Sonner for in-app toast notifications

**Implements architecture:**
- Session Manager with Automatic Refresh pattern
- Idempotent Booking API Calls pattern
- Monitoring & Alerting infrastructure

**Addresses features:**
- Success/Failure Notifications
- Intelligent Retry Logic
- Session Refresh Management

**Avoids pitfalls:**
- Session Token Expiration — proactive refresh prevents failures
- Missing Idempotency Protection — Redis-backed keys prevent duplicates
- Silent Job Failures — monitoring catches all failure modes
- Race Conditions — idempotency keys complement database locks

**Research flag:** Standard patterns, no additional research needed (well-documented monitoring and notification patterns)

### Phase 5: Recurring Patterns (v1.x)
**Rationale:** Adds after core single-booking automation is validated with real users. PROJECT.md requirement but deferred until foundation is solid. Allows learning from single-booking failures before automating at scale.

**Delivers:**
- Recurring pattern configuration UI
- Pattern storage (day of week, time, event signature)
- Weekly job to check for new matching events
- Individual scheduled bookings for each matched occurrence
- Pattern management (pause, edit, delete)

**Implements architecture:**
- Pattern matching using event signatures from Phase 1 schema
- Leverages existing scheduling infrastructure from Phase 3

**Addresses features:**
- Recurring Pattern Automation (PROJECT.md requirement)
- Booking Conflict Detection (needed when multiple patterns overlap)

**Avoids pitfalls:**
- Event ID Instability — pattern matching by signature already implemented in Phase 1

**Research flag:** NEEDS RESEARCH - Pattern matching algorithms and conflict detection strategies. Use `/gsd-research-phase` to investigate cron-like pattern matching and overlapping booking detection.

### Phase Ordering Rationale

Phase order follows strict dependency chain discovered in architecture research: 
1. Database schema must exist before any other work (all components depend on it)
2. UI components can develop in parallel with mock data (visual validation independent of backend)
3. API integration must work before scheduling depends on it (validates assumptions early)
4. Job scheduling requires working API client (cannot test booking automation without real API)
5. Reliability improvements add to working system (each is independent, non-breaking)
6. Recurring patterns build on validated single-booking flow (learns from real usage first)

This grouping avoids the architectural anti-pattern of "big bang integration" identified in research. Each phase delivers working functionality that can be tested independently. Failures isolate to specific layers rather than cascading through the system.

Critical pitfall mitigation is distributed across phases based on when each risk manifests:
- **Phase 1** addresses schema-level issues (unique constraints, event signatures) that are painful to retrofit
- **Phase 2** validates external dependencies early (API behavior, session lifecycle) before scheduling depends on them
- **Phase 3** implements core scheduling correctly from start (timezone handling, Inngest architecture) because retrofit is extremely difficult
- **Phase 4** adds defensive layers (idempotency, monitoring) that catch issues from Phases 2-3
- **Phase 5** defers complexity (pattern matching, conflict detection) until foundation is proven

### Research Flags

**Phases needing deeper research during planning:**
- **Phase 2 (ShaggyOwl API Integration)**: Complex integration with potentially undocumented third-party API. Need to research authentication flow specifics, endpoint contracts, error response formats, rate limiting, and session token lifecycle. ShaggyOwl documentation may be sparse or Italian-only.
- **Phase 3 (Job Scheduling Infrastructure)**: Inngest configuration for precise timestamp scheduling with timezone support is nuanced. Need to validate exact-timestamp execution patterns, timezone configuration (TZ=Europe/Rome), cold start behavior, and retry strategies specific to Inngest workers.
- **Phase 5 (Recurring Patterns)**: Pattern matching algorithms for weekly events with fuzzy signature matching needs research. Also conflict detection when multiple patterns target overlapping time slots.

**Phases with standard patterns (skip research-phase):**
- **Phase 1 (Foundation)**: Well-documented Next.js App Router setup, Postgres schema design, shadcn/ui component library. Standard patterns suffice.
- **Phase 4 (Reliability)**: Session refresh patterns, idempotency implementations, monitoring setup are all well-documented in architecture research sources. Apply established patterns.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All recommendations verified with official documentation (Next.js 16.2, Inngest 3.0, Auth.js v5, Drizzle 0.37). Negative claims (avoid Vercel Cron, avoid Moment.js) confirmed with official limitations documentation. Multiple sources cross-referenced for critical decisions. |
| Features | MEDIUM | Consistent across commercial booking software (Glofox, Virtuagym) and DIY implementations (GitHub gymbox-bot). Table stakes well-established. Differentiators based on competitive analysis but limited direct user interview data. Confidence in MVP scope is high, v2+ prioritization is medium. |
| Architecture | HIGH | Patterns verified with official Next.js architecture docs, BullMQ/Inngest documentation, and multiple 2026-dated implementation guides. Serverless booking system architecture is well-established domain with extensive documentation. Build order recommendations based on dependency analysis from multiple sources. |
| Pitfalls | HIGH | All pitfalls documented with concrete examples from production systems. Timezone handling pitfalls verified with DST-specific articles and scheduler documentation. Session expiration patterns confirmed with OWASP and booking system case studies. Race condition issues verified with database transaction documentation. Prevention strategies sourced from official best practices (AWS retry patterns, Stripe idempotency). |

**Overall confidence:** HIGH

The research is comprehensive with strong documentation coverage for stack, architecture, and pitfall prevention. Feature prioritization has medium confidence due to lack of direct user interviews, but this is acceptable for a private family/friends application where requirements are well-defined in PROJECT.md. All critical technical decisions (Inngest vs Vercel Cron, timezone handling approach, session management patterns) are backed by official documentation or verified through multiple authoritative sources.

### Gaps to Address

While overall confidence is high, several areas need validation during implementation:

- **ShaggyOwl API specifics**: Research found general booking API patterns but not ShaggyOwl-specific documentation. Phase 2 planning must include investigation of actual endpoint behavior, error codes, rate limits, and session token format. Test against real API in controlled manner (book events >7 days out, cancel immediately).

- **Inngest timezone behavior with Europe/Rome**: While Inngest documentation confirms timezone support, specific behavior during DST transitions (last Sunday March/October) needs validation. Phase 3 must include DST edge case testing: schedule job for post-transition date while in pre-transition period.

- **Recurring pattern conflict detection**: Research identified the need but did not specify algorithms. Phase 5 planning must research: how to detect overlapping time slots across patterns, how to warn users, whether to allow or block conflicts.

- **Production session token expiration times**: Research recommends proactive refresh but doesn't specify ShaggyOwl's actual codice_sessione lifetime. Phase 2 implementation must determine actual expiration (likely 5-60 minutes based on industry patterns) through testing.

- **Rate limiting specifics**: Research indicates ShaggyOwl likely has rate limits but specifics unknown. Phase 2 must monitor for 429 responses, check for Retry-After headers, and determine per-user or per-IP limits through controlled testing.

- **Cold start latency in production**: While research recommends pre-warming, actual Vercel serverless cold start times for this specific application need measurement. Phase 3 must track cold start frequency and duration to validate whether mitigation is necessary.

**Validation approach for gaps:**
- Create staging environment with separate ShaggyOwl test account
- NEVER test on events <2 days away (per PROJECT.md constraints)
- Use database branching (Neon) for PR-based testing
- Measure and log actual behaviors (session expiration, cold starts, rate limits)
- Update configurations based on measured values, not assumptions

## Sources

### Primary Sources (HIGH confidence)

**Stack verification:**
- [Next.js 16.2 Release](https://nextjs.org/blog/next-16-2) — Current version, Turbopack stable
- [Next.js App Router Documentation](https://nextjs.org/docs/app) — App Router architecture, Server Components
- [Auth.js v5 Migration Guide](https://authjs.dev/getting-started/migrating-to-v5) — Breaking changes, new patterns
- [Inngest Scheduled Functions](https://www.inngest.com/docs/guides/scheduled-functions) — Timezone-aware cron syntax
- [Drizzle ORM Neon Guide](https://orm.drizzle.team/docs/get-started/neon-new) — HTTP driver setup
- [Neon Serverless Driver](https://neon.com/docs/serverless/serverless-driver) — Edge compatibility
- [shadcn/ui CLI v4 Changelog](https://ui.shadcn.com/docs/changelog/2026-03-cli-v4) — March 2026 update
- [Vercel Cron Jobs Limitations](https://vercel.com/docs/cron-jobs) — Timing imprecision documented

**Architecture patterns:**
- [Next.js Official Architecture Docs](https://nextjs.org/docs/architecture)
- [BullMQ Official Documentation](https://bullmq.io/)
- [BullMQ Job Schedulers](https://docs.bullmq.io/guide/job-schedulers)

**Pitfall prevention:**
- [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [AWS Retry Backoff Pattern](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/retry-backoff.html)
- [Stripe Idempotent Requests](https://docs.stripe.com/api/idempotent_requests)

### Secondary Sources (MEDIUM confidence)

**Stack comparisons (2026-dated articles):**
- [Next.js App Router in 2026: Complete Guide](https://dev.to/ottoaria/nextjs-app-router-in-2026-the-complete-guide-for-full-stack-developers-5bjl)
- [Drizzle vs Prisma ORM 2026](https://makerkit.dev/blog/tutorials/drizzle-vs-prisma)
- [Inngest vs QStash vs BullMQ](https://www.buildmvpfast.com/alternatives/inngest)
- [Neon vs Supabase 2026](https://dev.to/whoffagents/neon-vs-supabase-vs-planetscale-managed-postgres-for-nextjs-in-2026-2el4)

**Feature research:**
- [5 Best Fitness Class Booking System in 2026](https://lunacal.ai/fitness-class-booking-scheduling-software/best)
- [Best Online Booking System for Fitness Classes (2026 Guide)](https://wod.guru/blog/best-online-booking-system-for-fitness-classes/)
- [Creating a Subscription Bot for Gym Classes - Medium](https://medium.com/@fredrik.jacobson/creating-a-subscription-bot-for-gym-classes-f00c33958894)
- [GitHub - gymbox-bot](https://github.com/alex3165/gymbox-bot) — DIY automation example

**Pitfall case studies:**
- [Timezone Handling in Web Applications (March 2026)](https://medium.com/@ashour521/timezone-handling-in-web-applications-the-problem-most-systems-eventually-face-a4eec11f7043)
- [Race Conditions in Hotel Booking Systems](https://www.amitavroy.com/articles/race-conditions-in-hotel-booking-systems-why-your-technology-choice-matters-more-than-you-think)
- [How to Solve Race Conditions in a Booking System](https://hackernoon.com/how-to-solve-race-conditions-in-a-booking-system)
- [Building a Ticketing System: Concurrency, Locks, and Race Conditions](https://codefarm0.medium.com/building-a-ticketing-system-concurrency-locks-and-race-conditions-182e0932d962)

### Verification Protocol Applied

All research files followed verification protocol:
- ✅ All version numbers verified with official release notes or documentation
- ✅ Negative claims (what NOT to use) verified with official docs or known limitations
- ✅ Multiple sources cross-referenced for critical recommendations
- ✅ Timezone scheduling capability verified in Inngest official docs
- ✅ Vercel Cron limitations documented in official Vercel documentation
- ✅ Package compatibility verified with official compatibility matrices
- ✅ Pitfall prevention strategies sourced from authoritative guides (AWS, OWASP, Stripe)
- ✅ Architecture patterns verified with official framework documentation

---

*Research completed: 2026-04-09*
*Ready for roadmap: yes*

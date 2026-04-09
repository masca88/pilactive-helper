# Pitfalls Research

**Domain:** Automated Booking/Scheduling Systems
**Researched:** 2026-04-09
**Confidence:** HIGH

## Critical Pitfalls

### Pitfall 1: Timezone-Aware Scheduling vs. UTC Storage Confusion

**What goes wrong:**
Storing future booking times in UTC causes silent failures when DST rules change or timezone offsets are modified between scheduling and execution. A booking scheduled for "7 days before event at 18:00 local time" may execute at 17:00 or 19:00 instead, causing users to miss the booking window entirely.

**Why it happens:**
Developers follow the common rule "always store in UTC" without understanding it only applies to past events or events with fixed UTC offsets. Future events tied to "wall clock time" (what the clock says at that location) require storing timezone information, not just UTC timestamps.

**How to avoid:**
- Store future event times as: `{ wallTime: "2026-04-21T18:00:00", timezone: "Europe/Rome" }` 
- Use IANA timezone identifiers (e.g., "Europe/Rome"), never offset strings (e.g., "GMT+1")
- Calculate the exact UTC timestamp only when scheduling the job, not when storing the user's intent
- Test extensively during DST transitions (last Sunday of March and October for Europe)

**Warning signs:**
- Jobs executing 1 hour off target during DST transitions
- Bookings failing because they trigger after the 7-day window closes
- User complaints about "wrong time" that only happen twice per year
- Using Date objects with fixed offsets instead of timezone-aware libraries

**Phase to address:**
Phase 1 (Core Scheduling Infrastructure) - Timezone handling must be built correctly from the start; retrofitting is extremely difficult and error-prone.

---

### Pitfall 2: Session Token Expiration Without Proactive Refresh

**What goes wrong:**
Third-party API session tokens expire silently, causing scheduled bookings to fail at execution time. The system discovers the token is invalid only when attempting the critical booking action, missing the narrow 7-day-before window. By the time a new token is obtained, the booking slot is filled.

**Why it happens:**
Developers store session tokens at login and assume they remain valid. Most booking APIs (including ShaggyOwl) use session-based authentication where `codice_sessione` expires after inactivity or absolute time limits. Without proactive refresh, tokens become stale between scheduling and execution.

**How to avoid:**
- Store token expiration time alongside the token: `{ codice_sessione: "...", expiresAt: timestamp, refreshAt: timestamp }`
- Implement proactive refresh: renew tokens at 50-75% of their lifetime, not at expiration
- Use a background job to refresh all user tokens 1-2 hours before scheduled bookings
- Validate token freshness before critical operations with a lightweight API call (e.g., fetch user profile)
- Store refresh token if available; if not, require re-authentication before critical booking windows
- Log token refresh failures immediately to alert users before their booking attempt

**Warning signs:**
- Authentication errors (401/403) during scheduled booking attempts
- Jobs completing but no booking created
- Increasing failure rates for users who haven't logged in recently
- No token validation before critical operations
- Missing monitoring for authentication-related errors

**Phase to address:**
Phase 2 (Job Execution & API Integration) - Must be implemented before production bookings. Test with deliberately expired tokens to verify recovery paths.

---

### Pitfall 3: Vercel Cron Job Non-Deterministic Execution

**What goes wrong:**
Vercel may invoke cron jobs at any point within the specified hour, and can occasionally deliver the same cron event more than once. For time-sensitive bookings that must execute exactly 7 days before at 18:00, this causes either: (1) jobs running too early (18:00-18:59 range) when booking window isn't open yet, or (2) duplicate booking attempts from the same cron trigger.

**Why it happens:**
Vercel distributes cron job load across infrastructure. For Hobby plan users especially, cron jobs are intentionally jittered within the hour. The event-driven system may deliver duplicate events due to at-least-once delivery semantics.

**How to avoid:**
- **Never rely on cron jobs alone for exact-time execution**
- Use cron as a trigger to enqueue precise jobs: cron runs every minute → checks database for pending bookings → schedules exact execution
- Implement idempotency keys for all booking operations (see Pitfall 6)
- Use database-backed job queue (e.g., BullMQ with Redis, Inngest, or QStash) for precise scheduling
- If using Vercel Cron for Hobby plan, expect ±60min variance and compensate with polling logic
- Add distributed locking to prevent concurrent execution: use Redis SET NX EX for atomic locks
- Test behavior by triggering the same job multiple times within seconds to verify idempotency

**Warning signs:**
- Bookings failing with "booking window not open yet" errors
- Duplicate bookings for the same event
- Inconsistent execution times across different scheduled jobs
- Using cron expressions finer than hourly granularity on Hobby plan
- No idempotency protection on booking endpoints

**Phase to address:**
Phase 1 (Core Scheduling Infrastructure) - Job queue architecture must be decided early. Moving from cron-only to queue-based later requires significant refactoring.

---

### Pitfall 4: Race Conditions on Concurrent Booking Attempts

**What goes wrong:**
When multiple users (or retry attempts) target the same event slot, the system creates duplicate bookings or allows overbooking. Classic race condition: two transactions read "slot available" → both proceed → both create bookings → one succeeds with ShaggyOwl API, one fails but already created local database record → data inconsistency.

**Why it happens:**
Booking systems inherently have high concurrency during popular time windows. Developers use naive read-then-write patterns without database-level concurrency controls. Even with API-side validation, local state can diverge if not properly synchronized.

**How to avoid:**
- **Database-level prevention:**
  - Use `SELECT ... FOR UPDATE` pessimistic locks when checking slot availability
  - Create unique constraints on `(user_id, event_id, booking_date)` to prevent duplicates
  - Use optimistic locking with version columns for conflict detection
  - Wrap booking logic in SERIALIZABLE or REPEATABLE READ transaction isolation
  
- **Application-level prevention:**
  - Implement distributed locks via Redis before API calls: `SET lock:booking:{eventId} "value" NX EX 10`
  - Use idempotency keys for all booking requests (see Pitfall 6)
  - Implement booking state machine: PENDING → CONFIRMING → CONFIRMED / FAILED
  - Validate ShaggyOwl API response matches expected booking before marking CONFIRMED
  
- **Design patterns:**
  - Message queue with single-consumer: serialize booking attempts per event
  - Deferred assignment: accept booking requests as PENDING, periodic job reconciles with API

**Warning signs:**
- Database deadlocks during high-traffic periods
- Users seeing "booking successful" but slot not reserved in gym system
- Duplicate bookings for same user + event combination
- No database constraints on booking uniqueness
- Using default READ COMMITTED isolation without additional locking
- Concurrent retry attempts for failed bookings

**Phase to address:**
Phase 2 (Job Execution & API Integration) - Must be implemented before enabling concurrent bookings or retry logic. Test with deliberate race conditions (parallel requests).

---

### Pitfall 5: Retry Logic Without Exponential Backoff and Jitter

**What goes wrong:**
Fixed-interval retries (e.g., retry every 1 second) create thundering herd problems when rate limits are hit. All failed requests retry simultaneously, immediately hitting the rate limit again, creating a failure loop. For time-sensitive bookings with narrow windows, naive retry exhausts the window without successful booking.

**Why it happens:**
Developers implement simple `setTimeout(retry, 1000)` without understanding distributed systems retry patterns. When ShaggyOwl API returns rate limit (429) or temporary failure (503), multiple scheduled jobs retry at identical intervals, amplifying the problem.

**How to avoid:**
- **Implement exponential backoff with jitter:**
  ```typescript
  delay = min(maxDelay, baseDelay * 2^attempt) + random(0, jitter)
  // Example: 1s → 2s → 4s → 8s (capped at 10s) + 0-1s jitter
  ```
  
- **Configuration:**
  - Base delay: 1-2 seconds
  - Max attempts: 3-5 for time-sensitive bookings
  - Max backoff cap: 10-30 seconds
  - Jitter: ±25% of calculated delay
  - Total retry deadline: aligned to booking window (e.g., 5 minutes max)
  
- **Error classification:**
  - **Retry:** 429 (rate limit), 503 (service unavailable), network timeouts
  - **Immediate retry once:** 500 (server error)
  - **Never retry:** 401/403 (auth failure - refresh token instead), 400 (bad request), 404 (endpoint not found)
  
- **Respect rate limit headers:**
  - Check `Retry-After` header if provided
  - Use `X-RateLimit-Remaining` to prevent hitting limits
  
- **Idempotency:**
  - All retries must use same idempotency key
  - Server-side: verify POST requests are idempotent or use idempotency keys

**Warning signs:**
- Consistent retry failures at same intervals
- Rate limit errors clustering in logs
- All retry attempts failing within 5 seconds
- No jitter in retry timing (perfectly synchronized)
- Retrying non-transient errors (4xx responses)
- Missing per-user or per-endpoint rate limit tracking

**Phase to address:**
Phase 2 (Job Execution & API Integration) - Must be in place before production bookings. Test by deliberately triggering rate limits and measuring retry distribution.

---

### Pitfall 6: Missing Idempotency Protection

**What goes wrong:**
Duplicate booking requests create multiple reservations for the same event. This happens due to: (1) Vercel cron duplicate events, (2) user clicking "book now" multiple times, (3) retry logic executing after original request succeeded, or (4) network issues causing client-side retries. Result: user has 2+ bookings for same slot, gym system confused, potential conflicts.

**Why it happens:**
Developers assume "if request succeeds, it only happened once." Network failures, system retries, and distributed system semantics break this assumption. Without idempotency keys, there's no way to distinguish "new booking request" from "retry of previous request."

**How to avoid:**
- **Generate idempotency keys:**
  ```typescript
  // Client/scheduler generates unique key per booking intent
  const key = `booking:${userId}:${eventId}:${bookingDate}`;
  // Or use UUID v4 for randomness
  const key = uuidv4();
  ```
  
- **Server-side implementation:**
  - Store idempotency key + result in Redis with TTL (24 hours)
  - On request: check Redis for existing key
  - If key exists: return original response (don't re-execute)
  - If key new: execute booking, store key + response atomically
  
- **Database pattern:**
  ```sql
  CREATE UNIQUE INDEX idx_booking_idempotency 
  ON bookings(idempotency_key);
  
  INSERT INTO bookings (idempotency_key, user_id, event_id, ...)
  VALUES (?, ?, ?, ...)
  ON CONFLICT (idempotency_key) DO NOTHING
  RETURNING id;
  ```
  
- **API request pattern:**
  ```typescript
  headers: {
    'Idempotency-Key': idempotencyKey,
    // ... other headers
  }
  ```

**Warning signs:**
- Duplicate booking records in database for same user + event
- Users complaining about multiple confirmations
- Gym system showing 2+ bookings for user on same slot
- No unique constraints on critical booking fields
- Retry logic without idempotency key preservation
- Missing Redis/cache layer for request deduplication

**Phase to address:**
Phase 2 (Job Execution & API Integration) - Implement before any production booking attempts. Test by sending identical requests in rapid succession.

---

### Pitfall 7: Silent Job Failures Without Monitoring

**What goes wrong:**
Scheduled booking jobs fail silently. User expects automatic booking but it never happens. System logs the error but sends no alert. User discovers failure only when manually checking gym app, finding the slot filled by others. By then, the booking window is closed.

**Why it happens:**
Cron jobs and serverless functions don't fail loudly - they exit with error codes that disappear unless explicitly monitored. Developers implement the "happy path" (successful booking) but neglect failure paths (error alerts, user notifications, recovery mechanisms).

**How to avoid:**
- **Implement heartbeat monitoring:**
  - Use dead man's switch pattern: job must ping monitoring endpoint on success
  - If ping doesn't arrive within expected window, trigger alert
  - Tools: Healthchecks.io, Cronitor, Better Stack, or build with Vercel Edge Functions + Upstash
  
- **Multi-layer alerting:**
  ```typescript
  // 1. Log structured errors
  logger.error('Booking failed', {
    userId, eventId, error: err.message,
    phase: 'api_call', timestamp: Date.now()
  });
  
  // 2. Alert to monitoring service
  await monitoring.alert('booking_failure', { userId, eventId });
  
  // 3. Notify user immediately
  await notification.send(userId, {
    type: 'booking_failed',
    event: eventDetails,
    reason: userFriendlyReason,
    action: 'manual_booking_required'
  });
  
  // 4. Create manual recovery task
  await queue.add('manual_review', { bookingAttemptId });
  ```
  
- **Proactive monitoring:**
  - Track success rate per user/event
  - Alert if success rate < 95% over 24 hours
  - Monitor job execution duration (detect timeouts before failures)
  - Track queue depth (detect accumulating failures)
  - Monitor API response times (detect degradation)
  
- **User-facing status:**
  - Show scheduled bookings as "PENDING" until confirmed
  - Update status to "CONFIRMED" only after API success
  - Show "FAILED" with actionable next steps (retry, manual booking)
  - Send push notification for state changes

**Warning signs:**
- Users reporting bookings didn't happen
- No monitoring dashboard for job success/failure rates
- Errors only visible in Vercel logs (not actionable)
- No user notification system for failures
- Missing "last successful execution" tracking
- No alerts configured for repeated failures
- Relying on manual log checking to discover issues

**Phase to address:**
Phase 2 (Job Execution & API Integration) - Monitoring must be in place before production. In Phase 3 (User Experience), add user-facing status and notifications.

---

### Pitfall 8: Hardcoded 7-Day Scheduling Assumption

**What goes wrong:**
The booking window rule changes (e.g., gym switches from 7 days to 6 days, or 8 days for premium members) but the system has "7 days" hardcoded throughout. Bookings start failing because they execute too early/late. Fixing requires hunting through codebase for all instances of "7 * 24 * 60 * 60 * 1000".

**Why it happens:**
Developers treat business rules as technical constants. The requirement "7 days before" becomes magic number `604800000` scattered across scheduling logic, database queries, and UI display code.

**How to avoid:**
- **Centralize business rules:**
  ```typescript
  // config/booking-rules.ts
  export const BOOKING_RULES = {
    advanceBookingDays: 7,
    advanceBookingTime: 'same', // 'same' | 'midnight' | 'specific'
    bookingWindowMinutes: 60, // how long booking window stays open
    retryWindowMinutes: 5, // max time to retry failed booking
    maxConcurrentBookings: 3,
  };
  
  // Make configurable per gym, user tier, event type
  export function getBookingWindow(
    eventDate: Date,
    gymId: string,
    userTier: 'free' | 'premium'
  ): { opensAt: Date, closesAt: Date } {
    // ...
  }
  ```
  
- **Database-driven configuration:**
  - Store rules in database, not code
  - Allow per-gym or per-event-type rules
  - Version rule changes (effective_from date)
  - Audit trail of rule modifications
  
- **Testing with variable rules:**
  - Test suite should parameterize booking windows
  - Verify system works with 1, 7, 14, 30 day windows
  - Test rule changes mid-operation (scheduled before change, executes after)

**Warning signs:**
- Magic numbers (604800000, 168, 7) in code
- Multiple places calculating "7 days before"
- No configuration file for business rules
- Rules hardcoded in SQL queries
- UI showing "7 days" as hardcoded text
- No ability to test with different booking windows

**Phase to address:**
Phase 1 (Core Scheduling Infrastructure) - Build configuration system from the start. Retrofitting is painful when logic is scattered.

---

### Pitfall 9: Event ID Instability Across Time

**What goes wrong:**
The gym's API uses different `id_orario_palinsesto` values for the same recurring event each week. User selects "Pilates Reformer Tuesday 18:00" and system stores `id_orario_palinsesto: 12345`. Next week, the same class has `id: 67890`. Scheduled booking fails with "event not found" because it's looking for the old ID.

**Why it happens:**
Third-party booking systems often generate new IDs for each schedule iteration. What looks like a "recurring event" to users is actually a series of unique event instances to the API. Storing IDs without understanding their scope/lifetime causes mismatches.

**How to avoid:**
- **Map by event characteristics, not just ID:**
  ```typescript
  interface BookingIntent {
    eventId?: string; // Store but don't rely solely on this
    eventSignature: {
      name: string; // "Pilates Reformer"
      dayOfWeek: number; // 2 (Tuesday)
      time: string; // "18:00"
      duration: number; // 60 minutes
      instructor?: string; // if relevant
      location?: string; // if gym has multiple locations
    };
    targetDate: Date;
  }
  ```
  
- **Fuzzy matching at execution time:**
  ```typescript
  // 7 days before booking, fetch current events for target date
  const events = await fetchEvents(targetDate);
  
  // Find by signature match, not just ID
  const matchedEvent = events.find(e => 
    e.name === intent.eventSignature.name &&
    e.dayOfWeek === intent.eventSignature.dayOfWeek &&
    e.time === intent.eventSignature.time &&
    e.duration === intent.eventSignature.duration
  );
  
  if (!matchedEvent) {
    // Alert user: event not found, may be canceled or rescheduled
    // Provide fallback: show similar events, ask user to confirm
  }
  ```
  
- **Verification step:**
  - 1 hour before scheduled booking: verify event still exists
  - If event missing/changed: notify user, pause auto-booking
  - If event matches: proceed with updated ID
  
- **Handle edge cases:**
  - Event canceled → notify user immediately
  - Event time changed → ask user if they want new time
  - Event full before booking window → notify, offer waitlist
  - Instructor changed → notify if relevant to user

**Warning signs:**
- "Event not found" errors during booking execution
- Same event works one week, fails the next
- No event verification before scheduled execution
- Relying solely on stored IDs without re-fetching
- No handling for canceled or rescheduled events
- Users reporting "my recurring booking stopped working"

**Phase to address:**
Phase 2 (Job Execution & API Integration) - Implement signature-based matching from the start. Test with events that have ID changes between weeks.

---

### Pitfall 10: Cold Start Delays for Time-Critical Operations

**What goes wrong:**
Vercel serverless function cold starts take 1-5+ seconds. For a booking that must execute exactly when the window opens (e.g., 18:00:00), cold start delays mean the request reaches ShaggyOwl API at 18:00:03. In high-demand slots, 3 seconds is enough for the slot to fill. User's auto-booking loses to manual bookings.

**Why it happens:**
Serverless functions are archived after inactivity. First invocation after archival requires unarchiving (1+ seconds) plus initialization. For infrequent jobs (once per day bookings), every execution is a cold start.

**How to avoid:**
- **Pre-warm functions:**
  - Schedule a "ping" request 30-60 seconds before critical booking
  - Ping initializes function, actual booking request hits warm instance
  - Use separate warmup endpoint to avoid wasting booking attempts
  
- **Optimize function size:**
  - Keep booking handler minimal (single purpose)
  - Move heavy dependencies to layers or external services
  - Use edge runtime (faster cold starts) if compatible
  - Enable Vercel's Fluid Compute bytecode caching (Node 20+)
  
- **Architectural alternatives:**
  - Use long-running processes for critical bookings (not serverless)
  - Consider dedicated VPS/container for job execution
  - Use Vercel Edge Functions (faster cold starts than Node.js functions)
  - Use external job queue service with keep-alive workers (Inngest, QStash)
  
- **Monitoring:**
  - Track cold start frequency and duration
  - Alert if cold starts > 2 seconds for booking functions
  - Monitor booking success correlation with cold starts
  
- **Accept limitations:**
  - If using Vercel serverless, expect 1-2s penalty on cold starts
  - Communicate to users: "bookings attempt within 5 seconds of window opening"
  - Don't promise "exactly 18:00:00" if architecture can't deliver

**Warning signs:**
- Logs showing 2-5 second function initialization times
- Booking failures clustered on first daily execution
- Success rate higher for users with multiple bookings (subsequent are warm)
- No pre-warming strategy for critical operations
- Using heavy frameworks (full Next.js bundle) in job handlers
- Booking handler imports unnecessary dependencies

**Phase to address:**
Phase 2 (Job Execution & API Integration) - Test cold start behavior early. If unacceptable, change architecture before building on serverless assumptions.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Storing only event ID, not event signature | Simple database schema | Breaks when API IDs change between weeks, no fuzzy matching | Never - event signatures are small, critical for reliability |
| Using Vercel Cron without job queue | No additional infrastructure | Cannot schedule precise times, no retry history, hard to debug | Only for non-critical tasks (cleanup, analytics) |
| Storing timestamps in UTC only | Follows common "best practice" | Silent failures during DST transitions, wrong execution times | Only for past events or absolute UTC times (never future wall-clock events) |
| Skipping idempotency keys for "internal" operations | Faster implementation | Duplicate bookings from retries, Vercel duplicate events | Never - idempotency is essential for booking systems |
| Storing session tokens without expiration tracking | Simpler auth flow | Silent booking failures when tokens expire | Never - token expiration is guaranteed |
| Fixed retry intervals instead of exponential backoff | Easier to implement | Thundering herd, rate limit loops, poor recovery | Only for single-tenant systems with no rate limits |
| Logging errors without alerting | Standard practice | Silent failures, users discover issues manually | Never for critical booking operations - only for non-critical background tasks |
| Hardcoding business rules (7 days) | Quick to implement | Codebase-wide changes when rules evolve | Never - rules WILL change |
| Assuming events exist at booking time | Simpler booking flow | Failures when events canceled/rescheduled | Never - always verify event before booking |
| Using default transaction isolation | Standard database setup | Race conditions, duplicate bookings, data corruption | Never for booking writes - always use explicit isolation levels or locks |

---

## Integration Gotchas

Common mistakes when connecting to external services.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| ShaggyOwl API Authentication | Storing `codice_sessione` once at login and reusing forever | Store expiration time, refresh proactively 1-2 hours before bookings, validate before critical operations |
| ShaggyOwl Event Fetching | Assuming `id_orario_palinsesto` is stable across weeks | Store event signature (name, day, time), re-fetch and match at execution time |
| ShaggyOwl Booking API | Retrying failed bookings with same parameters immediately | Implement exponential backoff, classify errors (retry vs. no-retry), check for idempotency |
| Rate Limiting | Retrying after 429 with fixed interval | Respect `Retry-After` header, use exponential backoff with jitter, track per-user quotas |
| Session Expiration | Discovering expired session during booking attempt | Background job validates and refreshes sessions before booking windows |
| Network Timeouts | Using default 30-60s timeouts for time-critical bookings | Set aggressive timeouts (3-5s) with retry logic, fail fast to preserve booking window |
| API Response Validation | Assuming 200 status means booking succeeded | Validate response body structure, verify booking ID returned, confirm state matches expected |
| Error Messages | Logging raw API errors to users | Map API errors to user-friendly messages, provide actionable next steps |
| API Versioning | Hardcoding `/v407/` in all API calls | Centralize base URL configuration, handle version changes gracefully |
| Timezone Handling | Using system timezone for API parameters | Always send dates in gym's timezone (Europe/Rome), never rely on server timezone |

---

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Polling API for all users' events on every cron tick | API rate limits, slow response times, high costs | Fetch events only when needed (7 days before user's booking), cache results for similar requests | >10 active users with multiple bookings |
| Storing all bookings in single table without indexes | Slow queries, full table scans, timeout errors | Index on `(user_id, target_date)`, `(event_id, booking_date)`, `(status, scheduled_at)` for job queries | >1,000 total bookings |
| Synchronous booking execution in API route | Vercel function timeouts (10-60s limit), user waiting during retries | Async job queue, return immediately with "PENDING" status, update async | First timeout (depends on retry count) |
| Loading all scheduled bookings into memory | High memory usage, function out-of-memory errors | Paginate database queries, process in batches, use streaming where possible | >500 concurrent scheduled bookings |
| No connection pooling to database | Connection exhaustion, "too many connections" errors | Use connection pooling (PgBouncer for Postgres), limit concurrent jobs | >20 concurrent job executions |
| Fetching full event details for list display | Slow page loads, high database load | Use pagination, lazy loading, fetch only required fields (id, name, date, time) | >100 events displayed |
| No caching for gym event data | Repeated identical API calls, rate limit exhaustion | Cache events with short TTL (5-15min), invalidate on booking actions | >5 users checking events simultaneously |
| Running all scheduled jobs in parallel | Database lock contention, API rate limit exhaustion, cold start storms | Process in batches, rate limit to 2-5 concurrent bookings, stagger execution | >10 bookings scheduled for same minute |
| No query timeout configuration | Hung database connections, cascading failures | Set query timeouts (5-10s), connection timeouts (3s), overall request deadline | First long-running query blocks others |
| Fetching user credentials for every job run | Database query overhead, slow job initialization | Cache credentials in Redis with expiration, refresh on auth failure | >50 jobs per minute |

---

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Storing gym credentials in plain text | Database breach exposes all user passwords, liability for credential theft | Encrypt at rest with app-level encryption (AES-256), use separate encryption keys per user, store keys in secrets manager |
| Logging API requests with credentials | Credentials in log files, accessible to anyone with log access | Sanitize logs: redact password/token fields, use structured logging with sensitive field filtering |
| Exposing `codice_sessione` in client-side code | Session hijacking, unauthorized bookings, account takeover | Keep sessions server-side only, never send to browser, use encrypted HTTP-only cookies for user auth |
| No rate limiting on booking endpoints | Abuse: malicious user fills all slots, denial of service | Rate limit per user (5 bookings/minute), per IP (10 bookings/minute), CAPTCHA for suspicious patterns |
| Allowing users to book for other users without verification | Griefing: user books slots to prevent others from joining | Verify booking user matches authenticated user, require explicit delegation for shared accounts |
| No audit trail for booking actions | Cannot investigate suspicious bookings, no accountability | Log all booking attempts with: user_id, event_id, timestamp, IP, outcome, reason for failure |
| Storing API endpoints and IDs in client code | Reverse engineering, direct API access bypassing app logic | Keep all API integration server-side, use opaque user-facing IDs |
| No validation of event data from API | Injection attacks if event names/descriptions contain malicious content | Sanitize all API responses before storage, validate against schema, escape for display |
| Using predictable idempotency keys | Key guessing allows replay attacks, unauthorized bookings | Use UUIDs or cryptographically random keys, include user context in key generation |
| No protection against concurrent login | Session fixation, credential stuffing detection issues | Invalidate old sessions on new login, limit active sessions per user, monitor for unusual login patterns |

---

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No visibility into scheduled bookings | User doesn't know if auto-booking is active, books manually creating duplicates | Dashboard showing: event name, scheduled date, auto-book time, status (PENDING/CONFIRMED/FAILED) |
| Generic error messages ("Booking failed") | User doesn't know why it failed or what to do | Specific messages: "Session expired - please log in again", "Event is full", "Event was canceled", with actionable buttons |
| No notification when booking succeeds | User checks gym app anyway, doesn't trust the system | Immediate notification (email, push, SMS) on success: "Booked Pilates Reformer for April 21 at 18:00" |
| Silent failure without user notification | User shows up to gym expecting to attend, discovers they're not booked | Alert on failure: "Auto-booking failed for April 21 - please book manually" sent within 1 minute of failure |
| Scheduling bookings without showing booking window | User doesn't understand why they can't book immediately | Show: "Booking window opens April 14 at 18:00, we'll book automatically at that time" |
| No way to cancel scheduled booking | User's plans change, booking happens anyway, wastes gym slot | Clear "Cancel Auto-Booking" button, confirm with "Are you sure? Booking window is [X] away" |
| Not explaining timezone handling | User confused about exact booking time, especially during DST | Show: "We'll book 7 days before at the same time (18:00 Rome time)", highlight DST if relevant |
| No feedback during long operations | User clicks "Schedule", nothing happens for 2-3 seconds, clicks again creating duplicate | Immediate UI response: "Scheduling...", disable button, show progress indicator |
| Hiding retry attempts from user | System retrying silently, user waiting without knowing status | Show: "Attempt 1 failed, retrying in 2 seconds... (2/5 attempts)" during active retries |
| No way to manually trigger booking | Auto-booking fails, user stuck waiting or must use gym app | "Retry Now" button for failed bookings, "Book Manually via App" deep link |
| Unclear recurring booking setup | User selects event, doesn't realize it won't repeat next week | Explicit: "Book Once" vs. "Book Every Week", show next 4 occurrences for recurring |
| No calendar view of scheduled bookings | User can't see their week at a glance, hard to spot conflicts | Calendar showing: confirmed bookings (green), scheduled auto-bookings (yellow), failed (red) |

---

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Timezone Handling:** Often missing DST transition testing — verify bookings work correctly on last Sunday of March and October
- [ ] **Session Refresh:** Often missing proactive refresh — verify tokens renewed before expiration, not at failure time
- [ ] **Retry Logic:** Often missing jitter — verify retry delays are randomized, not synchronized across users
- [ ] **Idempotency:** Often missing Redis TTL — verify keys expire after reasonable time (24 hours), preventing indefinite storage
- [ ] **Job Monitoring:** Often missing failure alerts — verify user notified within 1 minute of booking failure
- [ ] **Event Matching:** Often missing fallback for ID changes — verify fuzzy matching works when event ID differs from stored
- [ ] **Race Conditions:** Often missing database locks — verify concurrent bookings tested with parallel requests
- [ ] **Rate Limiting:** Often missing Retry-After handling — verify system respects API rate limit headers
- [ ] **Cold Starts:** Often missing pre-warming — verify critical bookings have <1s latency, not 3-5s cold start
- [ ] **Error Classification:** Often missing retry vs. no-retry logic — verify 4xx errors don't retry, 5xx/timeout do
- [ ] **Token Validation:** Often missing pre-flight check — verify token freshness tested before critical operations
- [ ] **Transaction Isolation:** Often missing explicit settings — verify using REPEATABLE READ or SERIALIZABLE, not READ COMMITTED
- [ ] **Audit Logging:** Often missing structured context — verify logs include user_id, event_id, timestamp for all booking attempts
- [ ] **User Notifications:** Often missing failure scenarios — verify notifications configured for ALL states (pending, confirmed, failed, retry)
- [ ] **Configuration:** Often missing database-driven rules — verify booking window days configurable, not hardcoded

---

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| **DST Time Shift** | LOW (if detected quickly) | 1. Identify affected bookings (scheduled during DST transition), 2. Recalculate correct execution times with timezone-aware library, 3. Update scheduled jobs, 4. Notify users of time correction |
| **Expired Session Token** | LOW | 1. Detect via auth error in logs, 2. Trigger immediate re-authentication for affected user, 3. If booking window still open: retry with fresh token, 4. If window closed: notify user of failure, log for manual handling |
| **Duplicate Bookings** | MEDIUM | 1. Query database for duplicates: `SELECT user_id, event_id, COUNT(*) ... HAVING COUNT(*) > 1`, 2. Call ShaggyOwl API to check which bookings exist, 3. Delete local duplicates, 4. Cancel duplicate gym bookings, 5. Notify user |
| **Missed Booking Window** | HIGH (unrecoverable) | 1. Detect via monitoring (booking executed too late), 2. Notify user immediately with apology, 3. Offer to book next occurrence if recurring, 4. Root cause analysis to prevent recurrence, 5. Consider compensation (priority booking) |
| **Race Condition Data Corruption** | MEDIUM | 1. Identify corrupted records (status mismatch with gym API), 2. Query ShaggyOwl API for source of truth, 3. Update local state to match, 4. Implement missing database constraints, 5. Add transaction logs for audit |
| **Event ID Changed** | LOW | 1. Event matching fails with "not found", 2. Fetch current events for target date, 3. Fuzzy match by signature (name, time, day), 4. If match found: update stored ID and proceed, 5. If no match: alert user (event may be canceled) |
| **Rate Limit Exhaustion** | LOW | 1. Detect 429 responses in monitoring, 2. Pause all bookings for affected user/account for Retry-After duration, 3. Queue pending bookings, 4. Resume after cooldown, 5. Review rate limit quotas, distribute load |
| **Cold Start Latency Loss** | MEDIUM (preventable) | 1. Logs show booking arrived after slot filled, 2. Implement pre-warming for next occurrence, 3. Consider architecture change (edge functions, dedicated VPS), 4. Set user expectations (bookings within 5s of window) |
| **Silent Job Failure** | MEDIUM | 1. User reports booking didn't happen, 2. Check logs for error, 3. If recoverable + window open: retry immediately, 4. If window closed: manual booking or next occurrence, 5. Implement monitoring to catch future failures |
| **Hardcoded Rules Changed** | HIGH (requires deployment) | 1. Identify all locations of hardcoded value via code search, 2. Extract to configuration, 3. Update values, 4. Deploy, 5. Migrate existing scheduled bookings to new rules, 6. Test thoroughly in staging |

---

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Timezone-Aware Scheduling | Phase 1 (Core Infrastructure) | Test suite with events scheduled during DST transitions, verify execution time matches wall clock |
| Session Token Expiration | Phase 2 (API Integration) | Deliberately expire tokens, verify proactive refresh prevents booking failures |
| Vercel Cron Non-Determinism | Phase 1 (Core Infrastructure) | Architecture decision: queue-based or accept jitter, test with duplicate event delivery |
| Race Conditions | Phase 2 (API Integration) | Parallel request test: 10 concurrent booking attempts for same event, verify only 1 succeeds |
| Retry Without Backoff | Phase 2 (API Integration) | Trigger 429 rate limit, verify retries are exponentially delayed with jitter |
| Missing Idempotency | Phase 2 (API Integration) | Send identical request 3 times rapidly, verify only 1 booking created |
| Silent Job Failures | Phase 2 (API Integration) + Phase 3 (UX) | Simulate failure, verify alert fires within 60s, user receives notification |
| Hardcoded Scheduling Rules | Phase 1 (Core Infrastructure) | Configuration test: change booking window from 7 to 6 days, verify no code changes needed |
| Event ID Instability | Phase 2 (API Integration) | Mock API returning different ID for same event, verify fuzzy matching succeeds |
| Cold Start Delays | Phase 2 (API Integration) | Measure cold start latency, verify <2s or implement pre-warming |
| Concurrent Booking Conflicts | Phase 2 (API Integration) | Database transaction test: verify SELECT FOR UPDATE prevents duplicates |
| API Rate Limits | Phase 2 (API Integration) | Simulate rate limit response, verify exponential backoff and Retry-After header respect |
| Monitoring Gaps | Phase 2 (API Integration) + Phase 3 (UX) | Failure scenario testing, verify all failure modes trigger appropriate alerts and notifications |

---

## Sources

### Booking System Pitfalls
- [5 Common Online Booking Mistakes and How to Avoid Them](https://www.site123.com/learn/5-common-online-booking-mistakes-and-how-to-avoid-them)
- [10 Signs Your Booking System Is Holding Your Business Back - Acuity Scheduling](https://acuityscheduling.com/learn/signs-your-booking-system-is-holding-you-back)
- [17 Common Mistakes to Avoid While Using Online Booking Systems](https://ezbook.com/mistakes-to-avoid-when-using-online-booking-system/)
- [5 Common Challenges in Appointment Scheduling and How to Overcome Them | Qminder](https://www.qminder.com/blog/challenges-in-appointment-scheduling/)

### Timezone & Job Scheduler Issues
- [One-off job incorrectly scheduled if scheduler timezone different from system timezone · Issue #133 · agronholm/apscheduler](https://github.com/agronholm/apscheduler/issues/133)
- [DBMS_SCHEDULER jobs running an hour late - DST/BST issues! | SnapDBA](https://snapdba.com/2014/10/dbms_scheduler-jobs-running-an-hour-late-dstbst-issues/)
- [Timezone Handling in Web Applications: The Problem Most Systems Eventually Face | by Mohamed Adel Ashour | Mar, 2026 | Medium](https://medium.com/@ashour521/timezone-handling-in-web-applications-the-problem-most-systems-eventually-face-a4eec11f7043)
- [How Should We Manage Time Zones ? | Insider One Engineering](https://medium.com/insiderengineering/how-should-we-manage-time-zones-f62d4c49c3ad)
- [What is the best way to store an appointment time? - Microsoft Q&A](https://learn.microsoft.com/en-us/answers/questions/1194364/what-is-the-best-way-to-store-an-appointment-time)
- [HighLevel Timezone API: Complete Integration Guide 2026](https://ghlbuilds.com/highlevel-timezone-api/)

### Session Management & Token Refresh
- [Token Best Practices - Auth0 Docs](https://auth0.com/docs/secure/tokens/token-best-practices)
- [Token Expiration & Refresh Best Practices for APIs | Duende](https://duendesoftware.com/learn/best-practices-managing-token-expiration-refresh-revocation-in-web-apis)
- [Auth.js | Refresh Token Rotation](https://authjs.dev/guides/refresh-token-rotation)
- [How Refresh Tokens Improve API Session Management](https://www.reform.app/blog/how-refresh-tokens-improve-api-session-management)
- [How to Handle Token Refresh in OAuth2](https://oneuptime.com/blog/post/2026-01-24-oauth2-token-refresh/view)

### Concurrent Booking & Race Conditions
- [Building a Ticketing System: Concurrency, Locks, and Race Conditions | by Arvind Kumar | Medium](https://codefarm0.medium.com/building-a-ticketing-system-concurrency-locks-and-race-conditions-182e0932d962)
- [Race Conditions in Hotel Booking Systems: Why Your Technology Choice Matters More Than You Think](https://www.amitavroy.com/articles/race-conditions-in-hotel-booking-systems-why-your-technology-choice-matters-more-than-you-think)
- [How to Solve Race Conditions in a Booking System | HackerNoon](https://hackernoon.com/how-to-solve-race-conditions-in-a-booking-system)
- [Concurrency Conundrum in Booking Systems | by Abhishek Ranjan | Medium](https://medium.com/@abhishekranjandev/concurrency-conundrum-in-booking-systems-2e53dc717e8c)
- [Concurrency Strategies in Multi-User Reservation Systems | by Sebastian Pawlaczyk | DevBulls | Medium](https://medium.com/devbulls/concurrency-strategies-in-multi-user-reservation-systems-b8142dea1bc8)
- [How I Design a Reservation System for race conditions with Async Processing — Simple and practical approach | by Dylan Lee | Medium](https://medium.com/@inexpressible2510/how-i-design-a-reservation-system-for-race-conditions-with-async-processing-simple-and-practical-7ffb50798fb2)
- [Hands-on Preventing Database Race Conditions with Redis | by Miftahul Huda | Medium](https://iniakunhuda.medium.com/hands-on-preventing-database-race-conditions-with-redis-2c94453c1e47)

### Database Transactions & Double-Booking Prevention
- [Handling the Double-Booking Problem in Databases](https://adamdjellouli.com/articles/databases_notes/07_concurrency_control/04_double_booking_problem)
- [Preventing Double Booking in Databases with Two-Phase Locking | by Jemil Oyebisi | Medium](https://medium.com/@oyebisijemil_41110/preventing-double-booking-in-databases-with-two-phase-locking-9a4538650496)
- [How to design a booking system to avoid overlapping reservation | by Oleg Potapov | Medium](https://oleg0potapov.medium.com/how-to-design-a-booking-system-to-avoid-overlapping-reservation-fe17194c1337)
- [Building a Seat Reservation System: Deadlock Avoidance and Transaction Isolation Levels](https://medium.com/womenintechnology/building-a-seat-reservation-system-deadlock-avoidance-and-transaction-isolation-levels-cad7186eb589)
- [How to Prevent Overbooking in SQL with Multiple Methods | Karhdo's Blog - Coding Adventure](https://karhdo.dev/blog/how-to-prevent-overbooking-in-sql-with-multiple-methods)

### Retry Logic & Exponential Backoff
- [How to Handle API Rate Limiting and Implement Exponential Backoff in GCP](https://oneuptime.com/blog/post/2026-02-17-how-to-handle-api-rate-limiting-and-implement-exponential-backoff-in-gcp/view)
- [API Rate Limit Exceeded? Causes, Fixes & How to Prevent It [2026 Guide]](https://www.digitalapi.ai/blogs/api-rate-limit-exceeded)
- [Retry with backoff pattern - AWS Prescriptive Guidance](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/retry-backoff.html)
- [API Retry Mechanism: How It Works + Best Practices](https://boldsign.com/blogs/api-retry-mechanism-how-it-works-best-practices/)
- [Respect API Rate Limits With a Backoff](https://developer.vonage.com/en/blog/respect-api-rate-limits-with-a-backoff-dr)

### Cron Job Monitoring
- [How to Monitor CronJob Last Successful Run and Alert on Missed Schedules](https://oneuptime.com/blog/post/2026-02-09-monitor-cronjob-missed-schedules/view)
- [Our complete cron job guide for 2026 - UptimeRobot Knowledge Hub](https://uptimerobot.com/knowledge-hub/cron-monitoring/cron-job-guide/)
- [How to Monitor Cron Jobs in 2026: A Complete Guide - DEV Community](https://dev.to/cronmonitor/how-to-monitor-cron-jobs-in-2026-a-complete-guide-28g9)
- [Monitoring Cron Jobs in Kubernetes: Why It's Harder Than You Think? - DEV Community](https://dev.to/cronmonitor/monitoring-cron-jobs-in-kubernetes-why-its-harder-than-you-think-99n)
- [10 Best Cron Job Monitoring Tools in 2026 | Better Stack Community](https://betterstack.com/community/comparisons/cronjob-monitoring-tools/)

### Vercel Cron Jobs & Limitations
- [Vercel Cron Jobs Documentation](https://vercel.com/docs/cron-jobs)
- [Vercel Limits](https://vercel.com/docs/limits)
- [Troubleshooting Vercel Cron Jobs | Vercel Knowledge Base](https://vercel.com/kb/guide/troubleshooting-vercel-cron-jobs)
- [Cronjobs are too limited · Issue #12058 · vercel/vercel](https://github.com/vercel/vercel/issues/12058)
- [Vercel Fluid Compute](https://vercel.com/docs/fluid-compute)

### Idempotency
- [Idempotency in APIs: Designing for Predictability and Safety](https://thearchitectsnotebook.substack.com/p/idempotency-in-apis-designing-for)
- [Idempotency in APIs: Making Sure API Requests Are Safe and Reliable | by Osama Haider | Medium](https://osamadev.medium.com/idempotency-in-apis-making-sure-api-requests-are-safe-and-reliable-7d5cb51520fe)
- [Idempotent requests | Stripe API Reference](https://docs.stripe.com/api/idempotent_requests)
- [Preventing Duplicate Operations in APIs with Idempotent Keys | by Anas Khafagy | Medium](https://medium.com/@anas.mdhat/preventing-duplicate-operations-in-apis-with-idempotent-keys-f67c3bf6117a)
- [Idempotency in APIs: Handling Duplicate Requests the Right Way | by Mohit Mallick | Medium](https://medium.com/@mohitmallick/idempotency-in-apis-handling-duplicate-requests-the-right-way-c35d108f98e0)

### Webhook Reliability
- [Webhook Reliability: Retry and Dead Letter Queues.](https://didit.me/blog/mastering-webhook-reliability-retry-and-dead-letter-queue-strategies/)
- [Webhook Retry Best Practices for Sending Webhooks](https://hookdeck.com/outpost/guides/outbound-webhook-retry-best-practices)
- [How to Implement Webhook Retry Logic - Latenode Blog](https://latenode.com/blog/integration-api-management/webhook-setup-configuration/how-to-implement-webhook-retry-logic)
- [How to Take Control of Your Webhook Reliability](https://hookdeck.com/webhooks/guides/taking-control-of-your-webhook-reliability)

### Next.js Error Handling
- [Next.js Server Actions: The Complete Guide (2026)](https://makerkit.dev/blog/tutorials/nextjs-server-actions)
- [Next.js Server Actions Error Handling: A Production-Ready Guide | by Pawan tripathi | Medium](https://medium.com/@pawantripathi648/next-js-server-actions-error-handling-the-pattern-i-wish-i-knew-earlier-e717f28f2f75)
- [Next.js Error Handling Patterns | Better Stack Community](https://betterstack.com/community/guides/scaling-nodejs/error-handling-nextjs/)
- [Production Error Handling in Next.js: Typed Errors, Structured Logging, and Alerting - DEV Community](https://dev.to/whoffagents/production-error-handling-in-nextjs-typed-errors-structured-logging-and-alerting-m1b)

### Observability & Monitoring
- [5 Observability & AI Trends Making Way for an Autonomous IT Reality in 2026](https://www.logicmonitor.com/blog/observability-ai-trends-2026)
- [Monitoring to Observability: A Complete Guide for Enterprise Systems in 2026](https://www.ir.com/guides/monitoring-to-observability)
- [Observability Predictions for 2026](https://middleware.io/blog/observability-predictions/)

---

*Pitfalls research for: Automated Booking/Scheduling Systems (PilActive Helper)*
*Researched: 2026-04-09*

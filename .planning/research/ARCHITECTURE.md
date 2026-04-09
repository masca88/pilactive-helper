# Architecture Research

**Domain:** Automated Booking System with Job Scheduling
**Researched:** 2026-04-09
**Confidence:** HIGH

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend Layer (Client)                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ React Pages  │  │ UI Components│  │ Client State │       │
│  │ (shadcn/ui)  │  │  (Calendar)  │  │              │       │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘       │
│         │                 │                 │                │
├─────────┴─────────────────┴─────────────────┴────────────────┤
│              Next.js Server Layer (App Router)               │
│  ┌──────────────────┐  ┌──────────────────┐                 │
│  │ Server Actions   │  │  API Routes      │                 │
│  │ (mutations)      │  │  (webhooks)      │                 │
│  └────────┬─────────┘  └────────┬─────────┘                 │
│           │                     │                            │
│  ┌────────┴─────────────────────┴─────────┐                 │
│  │         Business Logic Layer            │                 │
│  │  - Session Manager (refresh tokens)     │                 │
│  │  - External API Client (ShaggyOwl)      │                 │
│  │  - Job Queue Manager (BullMQ/Redis)     │                 │
│  └────────┬─────────────────────┬─────────┘                 │
├───────────┴─────────────────────┴───────────────────────────┤
│                   Persistence Layer                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │  PostgreSQL  │  │    Redis     │  │  External    │       │
│  │  (users,     │  │  (job queue, │  │  ShaggyOwl   │       │
│  │   schedules) │  │   sessions)  │  │   API        │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│               Job Execution Layer (Workers)                  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  BullMQ Worker Process (separate from Next.js)       │   │
│  │  - Polls Redis queue for scheduled jobs              │   │
│  │  - Executes booking at precise timestamps            │   │
│  │  - Handles retries & failure notifications           │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| **Frontend (React Pages)** | User interface for event selection, schedule management, notifications display | Next.js App Router pages with shadcn/ui components, Server Components for data fetching |
| **Server Actions** | Handle mutations (create/delete schedules, session management) | Next.js Server Actions with validation, keep client/server boundary clean |
| **API Routes** | Webhook endpoints for external triggers, health checks | Next.js Route Handlers for cron triggers or external service callbacks |
| **Session Manager** | Maintain ShaggyOwl session tokens, handle refresh/expiration | Redis-backed session store with automatic refresh logic, JWT or database sessions |
| **External API Client** | Communicate with ShaggyOwl API (login, fetch events, book, cancel) | Typed client with retry logic, idempotency keys, error handling |
| **Job Queue Manager** | Schedule and manage booking jobs at precise timestamps | BullMQ + Redis for reliable job scheduling with timezone support |
| **PostgreSQL Database** | Persist users, scheduled bookings, booking history, credentials | Relational schema with foreign keys, indexes on query patterns |
| **Redis** | Job queue persistence, session caching, distributed locks | In-memory data store for fast access and job coordination |
| **BullMQ Worker** | Separate Node.js process that executes scheduled jobs | Long-running worker process (not serverless) polling Redis queue |

## Recommended Project Structure

```
pilactive-helper/
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── (auth)/               # Route group for auth pages
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   └── layout.tsx
│   │   ├── (dashboard)/          # Route group for authenticated pages
│   │   │   ├── events/
│   │   │   │   └── page.tsx      # Browse available events
│   │   │   ├── schedules/
│   │   │   │   └── page.tsx      # View/manage scheduled bookings
│   │   │   └── layout.tsx
│   │   ├── api/
│   │   │   ├── cron/
│   │   │   │   └── route.ts      # Webhook endpoint for external cron
│   │   │   └── health/
│   │   │       └── route.ts      # Health check endpoint
│   │   └── layout.tsx
│   ├── lib/
│   │   ├── actions/              # Server Actions
│   │   │   ├── auth.ts           # Login/logout actions
│   │   │   ├── events.ts         # Fetch events from ShaggyOwl
│   │   │   └── schedules.ts      # Create/delete scheduled bookings
│   │   ├── api/
│   │   │   └── shaggyowl.ts      # External API client
│   │   ├── db/
│   │   │   ├── schema.ts         # Database schema (Drizzle/Prisma)
│   │   │   ├── queries.ts        # Database query functions
│   │   │   └── migrations/       # Database migrations
│   │   ├── jobs/
│   │   │   ├── queue.ts          # BullMQ queue setup
│   │   │   ├── worker.ts         # Job processor
│   │   │   └── schedules.ts      # Job scheduling logic
│   │   ├── session/
│   │   │   ├── manager.ts        # Session token management
│   │   │   └── refresh.ts        # Token refresh logic
│   │   └── utils/
│   │       ├── timezone.ts       # UTC/timezone conversions
│   │       ├── retry.ts          # Retry logic utilities
│   │       └── idempotency.ts    # Idempotency key generation
│   ├── components/
│   │   ├── ui/                   # shadcn/ui components
│   │   ├── events/
│   │   │   ├── event-list.tsx
│   │   │   └── event-card.tsx
│   │   ├── schedules/
│   │   │   ├── schedule-list.tsx
│   │   │   └── schedule-form.tsx
│   │   └── shared/
│   │       ├── header.tsx
│   │       └── error-boundary.tsx
│   └── types/
│       ├── shaggyowl.ts          # External API types
│       ├── database.ts           # Database types
│       └── jobs.ts               # Job types
├── worker/
│   └── index.ts                  # BullMQ worker entry point (separate process)
├── .env.example
├── package.json
└── vercel.json                   # Vercel config (if using Vercel cron)
```

### Structure Rationale

- **Route Groups `(auth)` & `(dashboard)`:** Keep URL structure clean (`/login`, `/events`) while organizing code logically and applying different layouts
- **Server Actions in `lib/actions/`:** Centralize mutations close to business logic, not scattered in page files; improves reusability and testing
- **Separate `worker/` directory:** BullMQ worker must run as a long-lived process, not serverless functions; clearly separated from Next.js app
- **`lib/api/shaggyowl.ts`:** Single source of truth for external API communication; typed interface, centralized error handling, session injection
- **`lib/session/manager.ts`:** Session token lifecycle (fetch, store, refresh, expire) isolated from business logic; critical for reliability
- **`lib/jobs/`:** Job scheduling logic separate from queue/worker infrastructure; easier to test scheduling logic without Redis
- **`components/` organized by domain:** `events/`, `schedules/`, `shared/` instead of flat structure; scales as features grow

## Architectural Patterns

### Pattern 1: Server Actions for Mutations

**What:** Use Next.js Server Actions for all user-initiated mutations (create schedule, delete schedule, login), avoiding traditional REST API routes for these operations.

**When to use:** All client-side form submissions and user actions that modify state. Server Actions reduce boilerplate, improve type safety with TypeScript inference, and keep mutations closer to the UI.

**Trade-offs:**
- **Pros:** Automatic serialization, progressive enhancement, less boilerplate than API routes, better TypeScript integration
- **Cons:** Only available in Next.js App Router, requires understanding of server/client boundary, harder to call from non-Next.js clients

**Example:**
```typescript
// src/lib/actions/schedules.ts
'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { scheduleBooking } from '@/lib/jobs/schedules'

export async function createScheduledBooking(eventId: string, bookingDate: string) {
  const userId = await getCurrentUserId() // from session
  
  // Store in database
  const schedule = await db.scheduledBookings.create({
    userId,
    eventId,
    bookingDate,
    scheduledFor: calculateBookingTime(bookingDate), // 7 days before
    status: 'pending'
  })
  
  // Add to job queue
  await scheduleBooking({
    scheduleId: schedule.id,
    executeAt: schedule.scheduledFor
  })
  
  revalidatePath('/schedules')
  return { success: true, scheduleId: schedule.id }
}
```

### Pattern 2: BullMQ Queue-Worker Architecture

**What:** Separate job scheduling (Next.js) from job execution (BullMQ worker) using Redis as the coordination layer. The Next.js app adds jobs to the queue, and a separate long-running Node.js process (worker) consumes and executes them.

**When to use:** Precise timing requirements, need for retries, background processing, or when serverless function timeouts are insufficient. Critical for this booking system since jobs must execute at exact timestamps (7 days before event).

**Trade-offs:**
- **Pros:** Reliable execution, precise scheduling, horizontal scaling, automatic retries, job persistence across restarts, handles concurrent execution
- **Cons:** Requires Redis infrastructure, additional deployment complexity (worker process), more moving parts than Vercel Cron
- **Why not Vercel Cron:** Hobby plan only runs once per day, timing cannot be assured (e.g., 1 AM triggers anywhere between 1:00-1:59 AM), potential duplicate execution

**Example:**
```typescript
// src/lib/jobs/queue.ts
import { Queue } from 'bullmq'
import { Redis } from 'ioredis'

const connection = new Redis(process.env.REDIS_URL)

export const bookingQueue = new Queue('bookings', { connection })

export async function scheduleBooking(data: {
  scheduleId: string
  executeAt: Date // Precise execution time
}) {
  await bookingQueue.add(
    'execute-booking',
    data,
    {
      delay: data.executeAt.getTime() - Date.now(),
      attempts: 3, // Retry up to 3 times
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: false, // Keep for history
      removeOnFail: false
    }
  )
}

// worker/index.ts (separate process)
import { Worker } from 'bullmq'
import { executeBooking } from './execute-booking'

const worker = new Worker(
  'bookings',
  async (job) => {
    if (job.name === 'execute-booking') {
      return await executeBooking(job.data)
    }
  },
  { connection }
)

worker.on('completed', (job) => {
  console.log(`Job ${job.id} completed`)
})

worker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed:`, err)
  // Send failure notification
})
```

### Pattern 3: Session Manager with Automatic Refresh

**What:** Centralized session management that handles ShaggyOwl `codice_sessione` lifecycle: fetch on login, store in Redis, automatically refresh before expiration, handle race conditions.

**When to use:** Interacting with external APIs that use session tokens or short-lived credentials. Critical for reliability since expired sessions would cause booking failures.

**Trade-offs:**
- **Pros:** Prevents authentication failures, centralizes credential logic, handles edge cases (refresh races, concurrent requests)
- **Cons:** Adds complexity, requires Redis or database for shared state, needs careful testing

**Example:**
```typescript
// src/lib/session/manager.ts
import { Redis } from 'ioredis'

const redis = new Redis(process.env.REDIS_URL)
const SESSION_EXPIRY = 30 * 60 // 30 minutes
const REFRESH_THRESHOLD = 5 * 60 // Refresh if < 5 min remaining

export class SessionManager {
  async getSession(userId: string): Promise<string> {
    const cached = await redis.get(`session:${userId}`)
    if (!cached) {
      return await this.refreshSession(userId)
    }
    
    const ttl = await redis.ttl(`session:${userId}`)
    if (ttl < REFRESH_THRESHOLD) {
      // Refresh in background, return cached for now
      this.refreshSession(userId).catch(console.error)
    }
    
    return cached
  }
  
  async refreshSession(userId: string): Promise<string> {
    // Distributed lock to prevent concurrent refreshes
    const lockKey = `session:lock:${userId}`
    const locked = await redis.set(lockKey, '1', 'EX', 10, 'NX')
    
    if (!locked) {
      // Another process is refreshing, wait and retry
      await new Promise(resolve => setTimeout(resolve, 1000))
      return this.getSession(userId)
    }
    
    try {
      const credentials = await getUserCredentials(userId)
      const newSession = await loginToShaggyOwl(credentials)
      
      await redis.setex(
        `session:${userId}`,
        SESSION_EXPIRY,
        newSession.codice_sessione
      )
      
      return newSession.codice_sessione
    } finally {
      await redis.del(lockKey)
    }
  }
}
```

### Pattern 4: Idempotent Booking API Calls

**What:** Generate unique idempotency keys for each booking attempt and include them in API calls to prevent duplicate bookings if retries occur.

**When to use:** Any mutation that must not be duplicated (payments, reservations, critical state changes). Essential for booking systems where double-booking would be catastrophic.

**Trade-offs:**
- **Pros:** Safe retries, prevents duplicate operations from network issues or concurrent requests
- **Cons:** Requires server-side support (ShaggyOwl API may not support it), need to store keys, adds complexity

**Example:**
```typescript
// src/lib/utils/idempotency.ts
import { randomUUID } from 'crypto'
import { db } from '@/lib/db'

export async function getOrCreateIdempotencyKey(
  scheduleId: string,
  operation: string
): Promise<string> {
  const existing = await db.idempotencyKeys.findUnique({
    where: { scheduleId, operation }
  })
  
  if (existing) return existing.key
  
  const key = randomUUID()
  await db.idempotencyKeys.create({
    data: { scheduleId, operation, key }
  })
  
  return key
}

// src/lib/api/shaggyowl.ts
export async function bookEvent(params: BookingParams) {
  const idempotencyKey = await getOrCreateIdempotencyKey(
    params.scheduleId,
    'book'
  )
  
  // If ShaggyOwl supports idempotency headers:
  const response = await fetch('/prenotazione_new', {
    method: 'POST',
    headers: {
      'Idempotency-Key': idempotencyKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(params)
  })
  
  // If not, track locally:
  if (response.ok) {
    await db.completedBookings.upsert({
      where: { idempotencyKey },
      update: { completedAt: new Date() },
      create: { idempotencyKey, scheduleId: params.scheduleId }
    })
  }
  
  return response
}
```

### Pattern 5: UTC-First Timezone Handling

**What:** Store all timestamps in UTC in the database, perform timezone conversions only at the boundaries (user input, display, job scheduling).

**When to use:** Always. Any application with scheduled tasks, especially when users or servers may be in different timezones. Critical for this project since Italian timezone (CET/CEST) must be handled correctly for 7-day-before calculation.

**Trade-offs:**
- **Pros:** Eliminates DST bugs, portable data, clear conversion points
- **Cons:** Requires discipline, conversion logic at boundaries

**Example:**
```typescript
// src/lib/utils/timezone.ts
import { utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz'

const ITALY_TZ = 'Europe/Rome'

// When user selects event: "2026-04-21 18:00" in Italy
export function calculateBookingTime(eventDateLocal: string): Date {
  // Parse as Italy time
  const eventDate = zonedTimeToUtc(eventDateLocal, ITALY_TZ)
  
  // Subtract 7 days
  const bookingDate = new Date(eventDate)
  bookingDate.setDate(bookingDate.getDate() - 7)
  
  // Store in database as UTC
  return bookingDate // This is UTC
}

// When scheduling BullMQ job
export async function scheduleBooking(scheduleId: string, bookingTimeUtc: Date) {
  await bookingQueue.add(
    'execute-booking',
    { scheduleId },
    {
      // BullMQ uses UTC internally
      delay: bookingTimeUtc.getTime() - Date.now()
    }
  )
}

// When displaying to user
export function formatForDisplay(utcDate: Date): string {
  const italyTime = utcToZonedTime(utcDate, ITALY_TZ)
  return format(italyTime, 'PPpp', { timeZone: ITALY_TZ })
}
```

## Data Flow

### Request Flow: Create Scheduled Booking

```
1. User selects event (April 21, 18:00)
        ↓
2. Client calls Server Action createScheduledBooking()
        ↓
3. Server Action validates & calculates booking time
   - Event: 2026-04-21 18:00 Italy → UTC
   - Booking time: 7 days before → UTC
        ↓
4. Store in PostgreSQL
   - scheduledBookings table (userId, eventId, scheduledFor UTC, status)
        ↓
5. Add job to BullMQ queue (Redis)
   - Job data: { scheduleId, executeAt: UTC timestamp }
   - Delay calculated from current time to executeAt
        ↓
6. Revalidate Next.js cache, return success to client
        ↓
7. Client shows confirmation UI
```

### Request Flow: Execute Booking (Worker)

```
1. BullMQ worker wakes at scheduled time
        ↓
2. Fetch schedule from PostgreSQL
   - Get userId, eventId, booking date
        ↓
3. Get user session token
   - SessionManager.getSession(userId)
   - Fetch from Redis or refresh if needed
        ↓
4. Call ShaggyOwl API: prenotazione_new
   - Include: codice_sessione, id_orario_palinsesto, data
   - Use idempotency key to prevent duplicates
        ↓
5. Handle response
   - Success: Update schedule status to 'completed', send notification
   - Failure: Throw error → BullMQ retries (up to 3 times)
        ↓
6. After retries exhausted: Update status to 'failed', send failure notification
```

### State Management Flow

```
Server State (Database)
    ↓ (query via Server Component)
React Server Component
    ↓ (render)
Client Component (display only)
    ↓ (user interaction)
Server Action (mutation)
    ↓ (update)
Server State (Database)
    ↓
revalidatePath() → Trigger re-fetch → Update UI
```

**Key principle:** No client-side global state needed. Server Components fetch data directly, Server Actions mutate and revalidate. Client Components only handle interactivity (forms, modals).

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| **1-10 users** | Single Vercel deployment + single Redis instance + single BullMQ worker. PostgreSQL on Vercel Postgres or Supabase free tier. No optimization needed. |
| **10-100 users** | Same infrastructure. Monitor BullMQ queue length. Add Redis persistence (AOF). Optimize database queries (indexes on userId, scheduledFor). Connection pooling for PostgreSQL. |
| **100-1000 users** | Scale BullMQ workers horizontally (2-3 instances). Redis Cluster for high availability. Upgrade PostgreSQL (connection limits). Add job monitoring (BullBoard UI). Implement rate limiting for ShaggyOwl API. |
| **1000+ users** | Consider separating worker infrastructure (dedicated servers/containers). Database read replicas if needed. Redis Sentinel for HA. Advanced job prioritization. Consider alternative to Vercel if egress costs grow. |

### Scaling Priorities

1. **First bottleneck: BullMQ worker throughput**
   - **Symptoms:** Jobs delayed beyond scheduled time, queue backlog growing
   - **Fix:** Add more worker instances (horizontal scaling), increase concurrency per worker
   - **Prevention:** Monitor queue metrics (waiting jobs, processing time)

2. **Second bottleneck: PostgreSQL connections**
   - **Symptoms:** Connection pool exhausted errors, slow queries
   - **Fix:** Connection pooling (PgBouncer), query optimization, indexes on frequent queries
   - **Prevention:** Use query analysis tools, monitor slow query log

3. **Third bottleneck: Redis memory**
   - **Symptoms:** Job data eviction, session loss
   - **Fix:** Upgrade Redis instance, implement job data cleanup, use Redis persistence
   - **Prevention:** Set TTL on completed jobs, monitor memory usage

**Note for this project:** With "few users" (family/friends), infrastructure is over-provisioned at launch. Start simple, monitor, scale only when metrics justify it.

## Anti-Patterns

### Anti-Pattern 1: Using Vercel Cron for Precise Scheduling

**What people do:** Configure Vercel cron jobs in `vercel.json` to trigger bookings at specific times, assuming it will execute exactly on schedule.

**Why it's wrong:**
- Hobby plan limited to once per day
- Timing cannot be assured (1 AM job runs anywhere from 1:00-1:59 AM)
- Can trigger duplicate executions
- No built-in retry mechanism
- Not suitable for "exactly 7 days before" requirement

**Do this instead:** Use BullMQ + Redis with a long-running worker process for precise, reliable scheduling. If must use serverless, consider external services like Schedo.dev or CronUptime that guarantee execution time.

### Anti-Pattern 2: Storing Session Tokens in Client-Side State

**What people do:** Fetch `codice_sessione` on login, store in React state or localStorage, include in client-side API calls.

**Why it's wrong:**
- Exposes credentials to XSS attacks
- Cannot be refreshed automatically
- Next.js Server Actions/API routes become client-side, bypassing security
- Credentials visible in browser DevTools
- Violates "server-to-server" requirement from project constraints

**Do this instead:** Store session tokens server-side only (Redis, database, or encrypted cookies with httpOnly flag). Manage sessions in Server Actions/API routes. Client never sees tokens.

### Anti-Pattern 3: Polling Database for Scheduled Jobs

**What people do:** Run a cron job every minute that queries database for jobs due now, then executes them.

**Why it's wrong:**
- Imprecise timing (up to 1-minute delay)
- Database load scales with job count
- Race conditions if multiple cron instances run
- Missed jobs if cron fails
- No automatic retry mechanism
- Poor scalability

**Do this instead:** Use a proper job queue (BullMQ, Bree) with delayed job support. Jobs are scheduled once, queue handles execution timing, retries, and concurrency.

### Anti-Pattern 4: Not Handling Timezone Transitions (DST)

**What people do:** Calculate "7 days before" using naive date arithmetic without considering Daylight Saving Time transitions.

**Why it's wrong:**
- Events scheduled during DST transition may execute at wrong hour
- Example: Event on March 30 (after DST) at 6 PM → booking on March 23 (before DST) calculates wrong time
- Users in different timezones see inconsistent times

**Do this instead:** Always store UTC in database, use timezone-aware libraries (date-fns-tz) for calculations, specify explicit timezone (Europe/Rome) for conversions. Test edge cases around DST boundaries.

### Anti-Pattern 5: Blocking Server Actions on External API Calls

**What people do:** Make Server Action wait for ShaggyOwl API response before returning to client.

**Why it's wrong:**
- Slow external APIs block user interaction
- Timeout issues if API is slow
- Poor user experience (long loading states)
- Server Action execution limits (Next.js has timeouts)

**Do this instead:** Server Action should validate, store in database, queue job, then return immediately to client. BullMQ worker handles external API call asynchronously. User sees instant confirmation, gets notification when complete.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| **ShaggyOwl API** | Server-side HTTP client with session management | All calls from Next.js API routes/Server Actions only. Include `codice_sessione` in every request. Implement exponential backoff retry (up to 3 attempts). Handle 401 (session expired) by refreshing. |
| **Redis** | BullMQ connection + session cache | Use single Redis instance for both BullMQ queue and session storage. Configure persistence (AOF) to prevent data loss. Use connection pooling for efficiency. |
| **PostgreSQL** | Drizzle ORM or Prisma | Define schema with migrations. Use connection pooling (Vercel Postgres includes PgBouncer). Indexes on: userId, scheduledFor, status. Foreign keys for referential integrity. |
| **Email Service** | Transactional email for notifications | Resend, SendGrid, or Postmark. Trigger from BullMQ worker on success/failure. Template: booking confirmed, booking failed (include retry status). |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| **Client ↔ Server** | Server Actions (forms), Server Components (data fetching) | Push 'use client' boundary down. Server Components for data, Client Components for interactivity only. No global state management needed. |
| **Next.js ↔ BullMQ** | Next.js adds jobs to queue, Worker processes them | Shared Redis connection. Next.js never directly calls worker code. Communication via job data only. |
| **Worker ↔ Database** | Direct PostgreSQL queries | Worker imports database client, queries/updates schedule status. Use same schema as Next.js app. Consider connection pooling for multiple workers. |
| **Session Manager ↔ Redis** | Get/set session tokens with TTL | Centralized module imported by Server Actions and Worker. Use distributed locks to prevent refresh race conditions. |

## Build Order Recommendations

Based on dependencies and risk reduction, recommend building in this order:

### Phase 1: Foundation (No External Dependencies)
1. Database schema + migrations (users, scheduled_bookings, events_cache)
2. Next.js app structure (routes, layouts, auth UI)
3. shadcn/ui components (EventList, ScheduleForm)

**Why first:** Establishes data model and UI foundation. Can develop/test without ShaggyOwl API or job scheduling.

### Phase 2: External API Integration
1. ShaggyOwl API client (login, fetch events, book, cancel)
2. Session manager (without Redis first, use in-memory Map for testing)
3. Server Actions for manual booking (immediate, no scheduling)

**Why second:** De-risks external API early. Validates credentials, API assumptions, error handling before adding scheduling complexity.

### Phase 3: Job Scheduling Infrastructure
1. Redis setup (local for dev, cloud for production)
2. BullMQ queue + worker setup
3. Timezone utilities (UTC calculations, DST handling)
4. Schedule creation flow (database → queue)

**Why third:** Core complexity of the project. Requires working API client (Phase 2). Can test with short delays (minutes) before production (7 days).

### Phase 4: Reliability & Polish
1. Session manager migration to Redis with refresh logic
2. Retry logic & error handling in worker
3. Idempotency keys for duplicate prevention
4. Notifications (email/UI) for booking results

**Why last:** Incremental improvements to already-working system. Each adds reliability without breaking existing functionality.

### Critical Dependencies

```
Database Schema
    ↓
UI Components (can use mock data)
    ↓
ShaggyOwl API Client (real integration)
    ↓
Manual Booking Flow (test API works)
    ↓
Redis + BullMQ Setup
    ↓
Scheduled Booking Flow
    ↓
Session Refresh + Retries
    ↓
Production Hardening
```

## Critical Patterns for Reliable Scheduling

### 1. Job Idempotency
Every scheduled job must be safe to execute multiple times. Store idempotency keys in database, check before executing booking API call.

### 2. Atomic State Transitions
Update schedule status atomically: `pending → processing → completed/failed`. Use database transactions to prevent race conditions.

### 3. Dead Letter Queue
Failed jobs (after retries exhausted) should move to separate queue for manual inspection. Don't silently drop failures.

### 4. Monitoring & Alerting
- Track job execution latency (scheduled time vs. actual execution time)
- Alert on queue backlog > threshold
- Monitor session refresh failures
- Log all booking attempts with outcome

### 5. Graceful Degradation
If ShaggyOwl API is down during scheduled booking:
- Retry with exponential backoff (5s, 10s, 30s)
- If still failing, send notification to user ("API unavailable, will retry")
- Keep job in queue for later retry instead of immediate failure

## Sources

### Next.js Architecture & Patterns
- [Next.js Official Architecture Docs](https://nextjs.org/docs/architecture)
- [Building a Serverless Booking System with Next.js](https://www.cshelton.co.uk/blog/2021/10/24/building-a-serverless-booking-system-with-nextjs/)
- [Building an Automated Scheduling System with Next.js](https://dev.to/hamzakhan/building-an-automated-scheduling-system-with-nextjs-1k22)
- [How to Organize Your Next.js App with the App Router](https://medium.com/@aritrapaulpc/how-to-organize-your-next-js-app-with-the-app-router-best-practices-folder-structures-4bba816df061)
- [Next.js App Router Project Structure Guide](https://makerkit.dev/blog/tutorials/nextjs-app-router-project-structure)

### Job Scheduling & Cron
- [Vercel Cron Jobs Documentation](https://vercel.com/docs/cron-jobs)
- [NextJS Cron Jobs Made Simple - Schedo.dev](https://www.schedo.dev/nextjs)
- [Cron Jobs in Next.js: Serverless vs Serverful](https://yagyaraj234.medium.com/running-cron-jobs-in-nextjs-guide-for-serverful-and-stateless-server-542dd0db0c4c)
- [5 Top Tools for Task Scheduling in Next.js](https://dev.to/ethanleetech/task-scheduling-in-nextjs-top-tools-and-best-practices-2024-3l77)

### BullMQ & Redis Architecture
- [BullMQ Official Documentation](https://bullmq.io/)
- [BullMQ Job Schedulers](https://docs.bullmq.io/guide/job-schedulers)
- [How BullMQ and Redis Work Together](https://medium.com/@gaurav.bhe.24/how-bullmq-and-redis-work-together-to-never-miss-a-scheduled-job-953f8c197314)
- [Job Scheduling in Node.js with BullMQ](https://betterstack.com/community/guides/scaling-nodejs/bullmq-scheduled-tasks/)

### Session Management
- [Next.js Authentication Guide](https://nextjs.org/docs/app/guides/authentication)
- [Next.js Session Management: Solving NextAuth Persistence Issues](https://clerk.com/articles/nextjs-session-management-solving-nextauth-persistence-issues)
- [Building a Secure BFF Architecture with Next.js](https://vishal-vishal-gupta48.medium.com/building-a-secure-scalable-bff-backend-for-frontend-architecture-with-next-js-api-routes-cbc8c101bff0)

### Error Handling & Retry Logic
- [Next.js Error Handling Patterns](https://betterstack.com/community/guides/scaling-nodejs/error-handling-nextjs/)
- [Production Error Handling in Next.js](https://dev.to/whoffagents/production-error-handling-in-nextjs-typed-errors-structured-logging-and-alerting-m1b)
- [Next.js Official Error Handling](https://nextjs.org/docs/app/getting-started/error-handling)

### Idempotency & API Reliability
- [Idempotency in Distributed Systems](https://medium.com/javarevisited/idempotency-in-distributed-systems-preventing-duplicate-operations-85ce4468d161)
- [Designing Idempotent APIs](https://medium.com/@sohail_saifi/designing-idempotent-apis-preventing-duplicate-requests-24f2305afa5e)
- [Implementing Idempotency Keys in REST APIs](https://zuplo.com/learning-center/implementing-idempotency-keys-in-rest-apis-a-complete-guide)

### Timezone Handling
- [Next.js Date & Time Localization Guide](https://staarter.dev/blog/nextjs-date-and-time-localization-guide)
- [Handling Date and Time in Next.js Best Practices](https://www.linkedin.com/pulse/handling-date-time-nextjs-best-practices-common-pitfalls-aloui-zxkze)
- [How to Handle Date and Time Correctly to Avoid Timezone Bugs](https://dev.to/kcsujeet/how-to-handle-date-and-time-correctly-to-avoid-timezone-bugs-4o03)

---
*Architecture research for: PilActive Helper - Automated Booking System*
*Researched: 2026-04-09*
*Confidence: HIGH (verified with official docs, current 2026 sources, multiple corroborating references)*

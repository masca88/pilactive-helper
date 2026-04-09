<!-- GSD:project-start source:PROJECT.md -->
## Project

**PilActive Helper**

Un'applicazione web che automatizza le prenotazioni agli eventi della palestra PilActive Sesto San Giovanni. Gli utenti possono selezionare eventi futuri e l'app prenota automaticamente esattamente 7 giorni prima (stesso giorno e ora) quando si apre la finestra di prenotazione, garantendo il posto prima che si riempia.

**Core Value:** Prenotare automaticamente gli slot di Pilates esattamente quando si aprono le prenotazioni (7 giorni prima), prima che si riempiano.

### Constraints

- **Stack Frontend**: React + Next.js + shadcn/ui (obbligatorio)
- **API Calls**: Server-to-server tramite Next.js API routes/server actions (non client-side)
- **Testing**: MAI prenotare eventi < 2 giorni da oggi in test
- **Testing**: MAI testare senza autorizzazione esplicita (API di produzione reali)
- **Deployment**: Cloud hosting (Vercel consigliato per Next.js)
- **Job Scheduling**: Necessario sistema affidabile per eseguire prenotazioni al timestamp esatto
<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->
## Technology Stack

## Recommended Stack
### Core Technologies
| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **Next.js** | 16.2+ | Full-stack React framework with App Router | Industry standard for React SSR/serverless. Built-in API routes for server-to-server calls, optimal Vercel deployment, stable Turbopack (400% faster dev). App Router supports Server Components reducing client JS. |
| **React** | 19+ | UI library with Server Components | Ships with Next.js 16. Server Components reduce bundle size, streaming with Suspense for better UX. |
| **TypeScript** | 5.7+ | Type-safe development | Prevents runtime errors in scheduling logic, type-safe API contracts, required for Drizzle ORM type inference. |
| **Neon Postgres** | Latest | Serverless database with branching | Best serverless Postgres for Vercel (official integration). Scales to zero when idle, HTTP/WebSocket drivers work in Edge Functions, database branching for PR workflows. No TCP limitations. |
| **Drizzle ORM** | 0.37+ | Type-safe database ORM | Lightweight (~7.4kb), SQL-like TypeScript API, excellent serverless cold starts, overtaking Prisma in new projects. Works natively with Neon's HTTP driver. |
| **Inngest** | 3.0+ | Durable job orchestration | Built for exact-timestamp scheduling with timezone support (TZ=Europe/Rome). Step functions survive failures, automatic retries, 50K free executions/month. Superior to Vercel Cron for mission-critical bookings. |
| **Auth.js** | v5 | Authentication framework | Successor to NextAuth.js. Universal `auth()` method, App Router-first, edge-compatible, automatic env var inference (AUTH_*). Industry standard for Next.js auth. |
| **Tailwind CSS** | 4.0+ | Utility-first CSS framework | Required constraint. v4 brings significant performance improvements, used by shadcn/ui. |
| **shadcn/ui** | CLI v4+ | Component system (copy-paste, not npm) | Required constraint. March 2026 update includes design system presets, Base UI support, framework-agnostic. Components live in your codebase for full customization. |
### Supporting Libraries
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **Zod** | 3.24+ | Runtime schema validation | Every Server Action input validation, API response validation, form schemas. Prevents invalid data from reaching booking logic. |
| **React Hook Form** | 7.54+ | Client-side form state management | Complex forms with shadcn/ui components. Works with React 19/Next.js 16 via useActionState integration. |
| **@tanstack/react-query** | v5+ | Client-side data fetching/caching | Optional: For polling booking status, optimistic updates, client-side caching of events list. Complements Server Components. |
| **Temporal API Polyfill** | @js-temporal/polyfill | Timezone-aware date handling | Calculate "7 days before at same time" accounting for DST transitions. Node.js 24+ has native support, use polyfill for Node 20/22. |
| **Resend** | 4.0+ | Transactional email delivery | Booking success/failure notifications. React Email integration for templates, real-time webhooks for delivery status. |
| **Sonner** | 1.7+ | Toast notifications | User feedback for booking actions, error messages, success confirmations. Recommended by shadcn/ui ecosystem. |
### Development Tools
| Tool | Purpose | Notes |
|------|---------|-------|
| **Drizzle Kit** | Database migrations and schema management | Use `drizzle-kit push` for local dev, `drizzle-kit generate` + `migrate` for production. Stores migrations in `/drizzle`. |
| **ESLint** | Code linting with Next.js config | Next.js 16 includes default ESLint config. Add Drizzle ESLint plugin for query linting. |
| **Prettier** | Code formatting | Use with `prettier-plugin-tailwindcss` for automatic class sorting. |
| **TypeScript Strict Mode** | Maximum type safety | Critical for scheduling logic to prevent date/timezone errors. Enable in tsconfig.json. |
## Installation
# Core framework and UI
# Database and ORM
# Job scheduling
# Authentication
# Validation and forms
# Date handling (for Node.js < 24)
# Email notifications
# UI components and utilities
# Development tools
## Alternatives Considered
| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| **Inngest** | QStash (Upstash) | If budget is extremely tight (QStash $1/100K messages vs Inngest $75/mo Pro after free tier) AND workflow is simple single-step delivery. QStash lacks step functions and durable workflows needed for retries. |
| **Inngest** | Vercel Cron Jobs | NEVER for this use case. Vercel Cron has ±1 hour precision on free tier, no timezone support, duplicate execution risk, no retries. Critical flaw for exact-timestamp bookings. |
| **Inngest** | BullMQ + Redis | If self-hosting on traditional server (not serverless). Requires Redis maintenance, no built-in timezone-aware scheduling. Not viable on Vercel. |
| **Drizzle ORM** | Prisma | If team strongly prefers schema-first over code-first, needs Prisma Accelerate for global connection pooling, or wants more abstraction from SQL. Prisma is larger (~300kb vs ~7kb) with slower serverless cold starts. |
| **Neon Postgres** | Supabase Postgres | If you need built-in auth/storage/realtime features from Supabase. For pure database, Neon is lighter and better Vercel integration. |
| **Auth.js v5** | Clerk | If you need pre-built UI components, user management dashboard, or B2B features (organizations, SSO). Clerk is paid service ($25/mo after 10K MAU). Auth.js v5 is sufficient for this multi-user but private app. |
| **React Hook Form** | Native React 19 forms | If forms are extremely simple (1-2 fields). For multi-field booking forms with validation, React Hook Form provides better UX. |
| **@tanstack/react-query** | Server Components only | If app is mostly static/server-rendered. Add TanStack Query when you need client-side polling or optimistic updates. |
## What NOT to Use
| Avoid | Why | Use Instead |
|-------|-----|-------------|
| **Vercel Cron Jobs** | ±1 hour precision (can trigger 1:00-1:59 for 1:00 cron), duplicate execution risk, no timezone support, cannot guarantee exact timestamp. Deal-breaker for "book exactly 7 days before at same time". | Inngest with TZ-aware cron scheduling |
| **Moment.js** | Deprecated library (maintenance mode since 2020), large bundle size, mutable dates cause bugs. Temporal API is the modern standard. | @js-temporal/polyfill or native Temporal (Node 24+) |
| **date-fns** | While maintained, doesn't handle timezones as robustly as Temporal API. Calculating "7 days before in Europe/Rome timezone with DST" is complex. | @js-temporal/polyfill for timezone-aware date math |
| **NextAuth.js v4** | Replaced by Auth.js v5. v4 patterns (getServerSession, authOptions) are outdated. v5 has breaking changes so migration is required anyway. | Auth.js v5 (next-auth@beta) |
| **Prisma (for edge)** | Cannot run in Vercel Edge Runtime due to binary dependencies. If you need edge, must use Drizzle. | Drizzle ORM with Neon serverless driver |
| **PlanetScale** | Lack of HTTP/REST API prevents usage from Vercel Edge Functions (TCP-only). Vitess compatibility layer adds complexity. | Neon Postgres with HTTP driver |
| **node-cron** | Runs in-process, not durable, lost on serverless function cold starts. Cannot persist scheduled jobs across deployments. | Inngest for durable scheduling |
| **Custom job queue** | Building your own queue with Redis/SQS adds complexity, maintenance burden, and doesn't solve timezone scheduling. High risk for mission-critical bookings. | Inngest (managed, durable, timezone-aware) |
## Stack Patterns by Variant
- Use Inngest with `TZ=Europe/Rome` cron syntax
- Use Temporal API to calculate "event_date minus 7 days at same time"
- Store scheduled job ID in database to enable cancellation
- Implement idempotent booking logic (check if already booked before API call)
- Because: Vercel Cron cannot guarantee minute-level precision, Inngest handles retries and DST transitions automatically
- Use Next.js Server Actions with "use server" directive
- Validate all inputs with Zod schemas
- Store session tokens in database, refresh on expiration
- Never expose API credentials to client (no client-side fetch)
- Because: Server Actions run server-side only, type-safe with TypeScript, protected from client tampering
- Store encrypted credentials in Neon Postgres user table
- Use Auth.js v5 session to scope queries by user
- Each user manages own ShaggyOwl email/password
- Consider credential encryption at rest (e.g., with AES-256)
- Because: Each user has separate gym account, app is private (not public service)
- Store pattern definition in database (e.g., "Pilates Reformer, Tuesday, 18:00")
- Use Inngest to check weekly for new events matching pattern
- Create individual scheduled bookings for each matched future event
- Allow user to skip/cancel individual instances
- Because: Gym posts events ~2 weeks ahead, need to schedule each instance when it appears
- Use Neon database branching for PR-based testing
- NEVER test bookings on events < 2 days away (per constraints)
- Mock ShaggyOwl API responses in local dev until ready for staging
- Use separate Neon branch for staging with real API (careful testing)
- Because: Production API has real bookings, database branching enables safe testing
## Version Compatibility
| Package | Compatible With | Notes |
|---------|-----------------|-------|
| Next.js 16.2+ | React 19+ | React 19 ships with Next.js 16 |
| Auth.js v5 (next-auth@beta) | Next.js 14.0+ | Minimum Next.js 14, fully compatible with 16 |
| Drizzle ORM 0.37+ | @neondatabase/serverless 0.9+ | Use Neon HTTP driver, not node-postgres |
| Drizzle ORM | TypeScript 5.0+ | Requires TypeScript for type inference |
| React Hook Form 7.54+ | React 19 | Compatible via useActionState integration |
| shadcn/ui (CLI v4) | Next.js 14+ | Works with App Router, requires Tailwind CSS |
| Inngest 3.0+ | Next.js 13.4+ App Router | Uses Route Handlers for webhooks |
| Temporal API Polyfill | Node.js 18+ | Native in Node.js 24+, polyfill for 18-22 |
| Resend 4.0+ | Next.js 13+ | Compatible with Server Actions |
| Zod 3.24+ | TypeScript 5.0+ | No specific Next.js requirement |
- **Vercel Edge Runtime**: Requires Drizzle + Neon HTTP driver (Prisma won't work)
- **Node.js Runtime on Vercel**: Node.js 20.x is default, 22.x and 24.x available
- **Temporal API**: Use polyfill for Node 20/22, native support in Node 24+
- **shadcn/ui**: Not an npm package, components copied to `/components/ui`
- **Auth.js v5**: Cookie prefix changed from `next-auth` to `authjs`, breaks existing sessions on migration
## Sources
- [Next.js 16.2 Release](https://nextjs.org/blog/next-16-2) — Current version, Turbopack stable, cache components
- [Next.js App Router Documentation](https://nextjs.org/docs/app) — App Router architecture, Server Components
- [Auth.js v5 Migration Guide](https://authjs.dev/getting-started/migrating-to-v5) — Breaking changes from v4, new patterns
- [Inngest Scheduled Functions](https://www.inngest.com/docs/guides/scheduled-functions) — Timezone-aware cron syntax
- [Drizzle ORM Neon Guide](https://orm.drizzle.team/docs/get-started/neon-new) — HTTP driver setup, migrations
- [Neon Serverless Driver](https://neon.com/docs/serverless/serverless-driver) — Edge compatibility, WebSocket fallback
- [shadcn/ui CLI v4 Changelog](https://ui.shadcn.com/docs/changelog/2026-03-cli-v4) — March 2026 update, design system presets
- [Next.js App Router in 2026: Complete Guide](https://dev.to/ottoaria/nextjs-app-router-in-2026-the-complete-guide-for-full-stack-developers-5bjl) — Best practices, production patterns
- [Drizzle vs Prisma ORM 2026](https://makerkit.dev/blog/tutorials/drizzle-vs-prisma) — Performance comparison, use case analysis
- [Inngest vs QStash vs BullMQ](https://www.buildmvpfast.com/alternatives/inngest) — Feature comparison, pricing analysis
- [Vercel Cron Jobs Limitations](https://vercel.com/docs/cron-jobs) — Timing imprecision, duplicate execution documented
- [Temporal API Mastery 2026](https://blog.weskill.org/2026/04/temporal-api-mastery-finally-fixing.html) — Timezone handling, DST transitions
- [Neon vs Supabase 2026](https://dev.to/whoffagents/neon-vs-supabase-vs-planetscale-managed-postgres-for-nextjs-in-2026-2el4) — Database comparison for Next.js
- [TanStack Query + Server Components 2026](https://dev.to/krish_kakadiya_5f0eaf6342/react-server-components-tanstack-query-the-2026-data-fetching-power-duo-you-cant-ignore-21fj) — Hybrid data fetching patterns
- [Zod with Next.js Server Actions](https://dev.to/whoffagents/zod-the-complete-validation-guide-for-nextjs-and-typescript-524k) — Validation patterns
- [React Hook Form with Next.js 16](https://medium.com/@sankalpa115/mastering-form-handling-in-next-js-15-with-server-actions-react-hook-form-react-query-and-shadcn-108f6863200f) — Integration with Server Actions
- [Resend with Next.js](https://resend.com/docs/send-with-nextjs) — Email integration guide
- ✅ All versions verified with official release notes or documentation
- ✅ Negative claims (what NOT to use) verified with official docs or known limitations
- ✅ Multiple sources cross-referenced for critical recommendations (Inngest vs Vercel Cron, Drizzle vs Prisma)
- ✅ Timezone scheduling capability verified in Inngest official docs
- ✅ Vercel Cron limitations documented in official Vercel documentation
- ✅ All package compatibility verified with official compatibility matrices
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, or `.github/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->

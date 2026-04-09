# Phase 1: Foundation & API Integration - Context

**Gathered:** 2026-04-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can authenticate with PilActive credentials and the system can communicate with ShaggyOwl API. This establishes the technical foundation: database, app authentication, and API client for gym booking system.

</domain>

<decisions>
## Implementation Decisions

### Database Schema
- **D-01:** Use Neon Postgres with Drizzle ORM (per CLAUDE.md stack)
- **D-02:** Separate tables: `users` table for app authentication, `credentials` table for PilActive gym credentials (normalized, allows future multi-account support)
- **D-03:** Store ShaggyOwl session tokens (`codice_sessione`) in credentials table to persist across app sessions and support scheduled automation

### Authentication Flow
- **D-04:** Two-step authentication: users create account on the app with email/password, then link PilActive credentials separately in settings/onboarding
- **D-05:** Use Auth.js v5 (next-auth@beta) for app authentication with credentials provider
- **D-06:** Each user has isolated credentials — multi-user support from day one
- **D-07:** Session management: Auth.js handles app sessions, ShaggyOwl tokens stored in DB with refresh logic

### API Client Architecture
- **D-08:** Modular function structure in `lib/api/shaggyowl/` — separate functions per endpoint (auth.ts, events.ts, booking.ts)
- **D-09:** Use Next.js Server Actions pattern (`"use server"` directive) for client-safe API calls
- **D-10:** Error handling: return `{success: boolean, data?, error?}` pattern — no exceptions, type-safe with Zod validation
- **D-11:** Include basic retry logic (2-3 attempts with exponential backoff) for transient network failures in Phase 1
- **D-12:** Base URL configuration via environment variable (`SHAGGYOWL_BASE_URL`)

### Project Structure
- **D-13:** Next.js 16 App Router with route groups: `app/(auth)/` for login, `app/(dashboard)/` for authenticated routes
- **D-14:** Standard conventions: `lib/` at root for shared utilities (lib/api/, lib/db/, lib/auth/, lib/utils/)
- **D-15:** Components: `components/ui/` for shadcn/ui components (copy-paste, not npm)
- **D-16:** Environment: single `.env.local` file for development with `DATABASE_URL`, `AUTH_SECRET`, `SHAGGYOWL_BASE_URL`
- **D-17:** TypeScript strict mode enabled from the start

### UI Components
- **D-18:** Install complete shadcn/ui component set upfront (~15-20 components) to establish design system
- **D-19:** Minimum Phase 1 components: Form, Input, Button, Label, Card, Alert for auth UI

### Claude's Discretion
- Exact database schema field names and types (follows Drizzle conventions)
- TypeScript interface definitions for ShaggyOwl API responses
- Specific exponential backoff timing for retries
- Auth.js session configuration details
- shadcn/ui theme customization and color scheme

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Stack and Architecture
- `CLAUDE.md` § Technology Stack — Neon Postgres, Drizzle ORM, Auth.js v5, Next.js 16 App Router patterns, version compatibility
- `.planning/REQUIREMENTS.md` — AUTH-01, AUTH-03, AUTH-04 requirements for Phase 1

### API Documentation
- `.planning/PROJECT.md` § API della Palestra (ShaggyOwl) — Endpoint details, authentication flow, session token (`codice_sessione`), test credentials

No external specs — requirements are fully captured in planning documents above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- None — greenfield project, no existing code

### Established Patterns
- None yet — Phase 1 will establish:
  - Database schema conventions with Drizzle
  - API client patterns for ShaggyOwl
  - Auth.js session management
  - Next.js App Router structure with route groups

### Integration Points
- Neon Postgres database (serverless, Vercel integration)
- Auth.js v5 authentication provider
- ShaggyOwl API at https://app.shaggyowl.com
- Future phases will build on auth layer and API client from Phase 1

</code_context>

<specifics>
## Specific Ideas

- Test credentials available: gigante.margherita@gmail.com / Pallino1 for ShaggyOwl API testing
- ShaggyOwl API requires `id_sede=12027` parameter for PilActive Sesto San Giovanni gym
- Session token refresh will be needed but can be basic in Phase 1 — Phase 4 adds proactive refresh
- Database branching with Neon enables safe testing without touching production data
- Constraint: NEVER test on events < 2 days away, use staging branch for API testing

</specifics>

<deferred>
## Deferred Ideas

- Credential encryption at rest — deferred to security discussion if needed (Phase 4 or security audit)
- Advanced retry strategies (exponential backoff tuning, circuit breaker) — Phase 4 Production Reliability
- Session token proactive refresh (1-2 hours before expiration) — AUTH-02 in Phase 3
- Multiple PilActive accounts per user — future enhancement, schema supports it but not in v1 UI

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-foundation-api-integration*
*Context gathered: 2026-04-09*

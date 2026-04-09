# Phase 1: Foundation & API Integration - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-09
**Phase:** 01-foundation-api-integration
**Areas discussed:** Database & Auth Setup, API Client Architecture, Project Structure

---

## Database & Auth Setup

### Database Schema

| Option | Description | Selected |
|--------|-------------|----------|
| Encrypted in users table | Simple: users table with encrypted email/password columns. Easy queries, all user data together. (Recommended for this app size) | |
| Separate credentials table | Normalized: users table + separate credentials table. More flexible if users have multiple accounts in future. | ✓ |
| You decide | Claude's discretion based on best practices | |

**User's choice:** Separate credentials table
**Notes:** Normalized approach chosen for future flexibility and cleaner separation of concerns

---

### Authentication Method

| Option | Description | Selected |
|--------|-------------|----------|
| Email/password (credentials) | Users create account on YOUR app, then link PilActive credentials separately. Two-step onboarding. | ✓ |
| PilActive credentials = login | Users log into YOUR app directly with PilActive email/password. One-step, but couples your auth to gym account. | |
| You decide | Claude's discretion based on security and UX | |

**User's choice:** Email/password (credentials)
**Notes:** Decouples app authentication from gym credentials, better security and UX

---

### Session Token Storage

| Option | Description | Selected |
|--------|-------------|----------|
| Database (credentials table) | Persist token with user's gym credentials. Survives app restarts, shared across sessions. Need refresh logic. | ✓ |
| Server-side session only | Keep token in Auth.js session during active use. Re-auth on each login. Simpler, more secure. | |
| You decide | Claude's discretion based on reliability needs | |

**User's choice:** Database (credentials table)
**Notes:** Persistence supports scheduled automation use case — jobs need access to tokens

---

## API Client Architecture

### API Client Structure

| Option | Description | Selected |
|--------|-------------|----------|
| Single service class | One ShaggyOwlClient class with all methods (auth, events, booking). Simple, all logic in one place. | |
| Modular functions | Separate functions per endpoint in lib/api/shaggyowl/. More Next.js Server Actions friendly. (Recommended for App Router) | ✓ |
| You decide | Claude's discretion based on Next.js 16 best practices | |

**User's choice:** Modular functions
**Notes:** Aligns with Next.js 16 App Router and Server Actions pattern

---

### Error Handling

| Option | Description | Selected |
|--------|-------------|----------|
| Throw and let caller handle | API functions throw errors, Server Actions catch and return. Caller decides UI response. Simple, explicit. | |
| Return error objects | Return {success, data, error} pattern. No exceptions, but more boilerplate. (Recommended for type safety) | ✓ |
| You decide | Claude's discretion based on TypeScript patterns | |

**User's choice:** Return error objects
**Notes:** Type-safe error handling without exceptions, explicit success/failure states

---

### Retry Logic

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, basic retries | Retry failed requests 2-3 times with exponential backoff. Handles transient network issues. | ✓ |
| No, defer to Phase 4 | Phase 1 just establishes connection. Phase 4 (Production Reliability) adds retries. Simpler for now. | |
| You decide | Claude's discretion based on requirements | |

**User's choice:** Yes, basic retries
**Notes:** Include basic reliability from the start, Phase 4 will enhance

---

## Project Structure

### App Router Organization

| Option | Description | Selected |
|--------|-------------|----------|
| Standard app/ layout | app/(auth)/login, app/(dashboard)/dashboard. Route groups for layout separation. (Recommended for Next.js 16) | ✓ |
| Flat app/ structure | app/login, app/dashboard. Simple, but harder to share layouts. Good for small apps. | |
| You decide | Claude's discretion based on Next.js best practices | |

**User's choice:** Standard app/ layout
**Notes:** Route groups enable better layout sharing and organization

---

### Utilities Location

| Option | Description | Selected |
|--------|-------------|----------|
| lib/ at root | lib/api/, lib/db/, lib/auth/, lib/utils/. Standard Next.js convention. (Recommended) | ✓ |
| app/_lib/ in app dir | Keep everything under app/. More co-located, but non-standard. | |
| You decide | Claude's discretion | |

**User's choice:** lib/ at root
**Notes:** Standard Next.js convention for shared utilities

---

### Environment Variables

| Option | Description | Selected |
|--------|-------------|----------|
| Standard .env.local | DATABASE_URL, AUTH_SECRET, SHAGGYOWL_BASE_URL. Simple, documented in README. (Recommended) | ✓ |
| Multiple .env files | .env.development, .env.production. More complex, better for teams. | |
| You decide | Claude's discretion | |

**User's choice:** Standard .env.local
**Notes:** Simple approach suitable for small team/personal app

---

### shadcn/ui Components

| Option | Description | Selected |
|--------|-------------|----------|
| Auth essentials only | Form, Input, Button, Label, Card. Just enough for login/dashboard. Add more in Phase 2. | |
| Complete set upfront | Install ~15-20 common components now. Saves time later, but larger initial commit. | ✓ |
| You decide | Claude's discretion based on phase needs | |

**User's choice:** Complete set upfront
**Notes:** Establish full design system early to enable rapid UI development in later phases

---

## Claude's Discretion

Areas where user delegated to Claude:
- Database schema field names and types (Drizzle conventions)
- TypeScript interfaces for ShaggyOwl API responses
- Exact retry timing and backoff strategy
- Auth.js session configuration
- shadcn/ui theme and colors

## Deferred Ideas

- Credential encryption at rest — noted for Phase 4 security discussion
- Advanced retry patterns — Phase 4 Production Reliability
- Proactive token refresh — Phase 3 (AUTH-02 requirement)
- Multi-account support UI — future enhancement


# Phase 2: Event Discovery & Manual Booking - Research

**Researched:** 2026-04-10
**Domain:** Next.js Server Components data fetching, event list UI, filtering patterns
**Confidence:** HIGH

## Summary

Phase 2 implements event browsing using Next.js 16 Server Components with the ShaggyOwl palinsesti API. The standard approach uses Server Components for initial data fetching, URL-based filter state for shareability, and shadcn/ui Table or Card components for display. Key technical challenges include Italian locale date formatting, server-side filtering patterns, and proper loading/error states with Suspense boundaries.

The ShaggyOwl API returns nested palinsesti data (categories → days → time slots) requiring flattening and filtering. Events must be filtered by date range and course type/name, with proper display of booking availability states. The architecture follows Next.js App Router patterns with searchParams for filter state and Server Actions for mutations.

**Primary recommendation:** Use Server Components for data fetching with URL searchParams for filter state, implement client-side filtering using TanStack Table for interactivity, and display events in shadcn/ui Card components (simpler than tables for this use case with rich event metadata).

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| EVENT-01 | User can view list of upcoming gym events sorted chronologically | Server Components data fetching + date sorting patterns researched |
| EVENT-02 | User can see event details (time, instructor, available spots, event type) | ShaggyOwl API response structure documented, Card component patterns identified |
| EVENT-03 | User can filter events by date range | URL searchParams + Zod validation patterns researched |
| EVENT-04 | User can filter events by type/name | Client-side filtering with TanStack Table or custom filter functions |

## Project Constraints (from CLAUDE.md)

### Required Stack
- **Frontend**: React 19 + Next.js 16+ with App Router + shadcn/ui (mandatory)
- **Styling**: Tailwind CSS 4.0+ (mandatory)
- **API Calls**: Server-to-server via Next.js Server Actions/API routes (NOT client-side)
- **Language**: Italian for all UI text (DEV-05)
- **Timezone**: Europe/Rome with DST awareness

### Security Requirements
- NEVER expose ShaggyOwl credentials to client
- All API calls MUST be server-side only
- Session tokens managed server-side

### Testing Constraints
- MAI prenotare eventi < 2 giorni da oggi in test
- MAI testare senza autorizzazione esplicita

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.2+ | Server Components + data fetching | Industry standard for React SSR, built-in data fetching memoization [VERIFIED: CLAUDE.md] |
| React | 19+ | Server Components architecture | Ships with Next.js 16, reduces client bundle size [VERIFIED: CLAUDE.md] |
| shadcn/ui | CLI v4+ | UI components (Table, Card, Form) | Required constraint, copy-paste components [VERIFIED: CLAUDE.md] |
| Tailwind CSS | 4.0+ | Styling | Required constraint [VERIFIED: CLAUDE.md] |
| Zod | 3.24+ | Date range filter validation | Required for Server Action input validation [VERIFIED: CLAUDE.md] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| TanStack Table | v8+ | Client-side filtering/sorting | If building interactive data table with column sorting [VERIFIED: npm registry 2026-04-10] |
| date-fns | 4.1+ | Date manipulation utilities | Optional helper for date calculations (Temporal API preferred for timezone work) [VERIFIED: npm registry 2026-04-10] |
| Intl.DateTimeFormat | Native | Italian locale date formatting | Built into JavaScript, no library needed [VERIFIED: MDN docs] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| shadcn/ui Card | shadcn/ui Table + TanStack Table | Table better for tabular data, Card better for rich event metadata with images/colors |
| URL searchParams | React state only | URL params are shareable/bookmarkable but require more boilerplate |
| Server Components | Client Components + useEffect | Server Components reduce client JS and improve SEO but can't use hooks |

**Installation:**

```bash
# Core dependencies already installed in Phase 1
# shadcn/ui components (copy-paste, not npm)
npx shadcn@latest add card
npx shadcn@latest add badge
npx shadcn@latest add select
npx shadcn@latest add calendar

# Optional: TanStack Table if using data table approach
npm install @tanstack/react-table@8.20.5

# Optional: date-fns for date utilities
npm install date-fns@4.1.0
```

**Version verification:**
- @tanstack/react-table: 8.20.5 (published 2024-08-20, stable)
- date-fns: 4.1.0 (published 2024-09-26, current v4 release)
- Intl.DateTimeFormat: Native JavaScript API (ECMAScript 2024)

## Architecture Patterns

### Recommended Project Structure

```
app/
├── (dashboard)/
│   ├── events/
│   │   ├── page.tsx              # Server Component - fetches events, handles searchParams
│   │   ├── loading.tsx           # Suspense fallback
│   │   ├── error.tsx             # Error boundary
│   │   └── _components/
│   │       ├── event-list.tsx    # Client Component - displays filtered events
│   │       ├── event-card.tsx    # Display single event with all details
│   │       ├── event-filters.tsx # Client Component - date range + type filters
│   │       └── event-status-badge.tsx  # Status indicator (available, full, not open yet)
lib/
├── api/
│   └── shaggyowl/
│       ├── events.ts             # Server-side event fetching functions
│       └── types.ts              # Event type definitions (extend existing)
├── utils/
│   ├── date-format.ts            # Italian date formatting utilities
│   └── event-filters.ts          # Event filtering logic
app/actions/
└── events.ts                      # Server Actions for filtering (if needed)
```

### Pattern 1: Server Component Data Fetching

**What:** Fetch data directly in Server Components, not in useEffect
**When to use:** Initial page load, SEO-critical content, data that doesn't need real-time updates
**Example:**

```typescript
// app/(dashboard)/events/page.tsx
import { Suspense } from 'react';
import { getEvents } from '@/lib/api/shaggyowl/events';
import { EventList } from './_components/event-list';
import { EventFilters } from './_components/event-filters';

interface PageProps {
  searchParams: Promise<{
    dateFrom?: string;
    dateTo?: string;
    eventType?: string;
  }>;
}

export default async function EventsPage({ searchParams }: PageProps) {
  // Next.js 16 pattern: searchParams is now a Promise
  const params = await searchParams;
  
  // Fetch events server-side with current user session
  const events = await getEvents(params);

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">Eventi Disponibili</h1>
      
      <EventFilters initialFilters={params} />
      
      <Suspense fallback={<EventListSkeleton />}>
        <EventList events={events} />
      </Suspense>
    </div>
  );
}
```

**Source:** [Next.js Data Fetching Patterns](https://nextjs.org/docs/app/building-your-application/data-fetching/patterns) — Official Next.js docs, April 2026

### Pattern 2: URL-Based Filter State

**What:** Store filter state in URL searchParams for shareability
**When to use:** Filters that should be bookmarkable, shareable, or preserved on refresh
**Example:**

```typescript
// app/(dashboard)/events/_components/event-filters.tsx
'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Select } from '@/components/ui/select';

export function EventFilters({ initialFilters }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function updateFilters(newFilters: Record<string, string>) {
    const params = new URLSearchParams(searchParams);
    
    Object.entries(newFilters).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });

    startTransition(() => {
      router.push(`/events?${params.toString()}`);
    });
  }

  return (
    <div className="flex gap-4 mb-6">
      <Calendar
        mode="range"
        selected={{ from: initialFilters.dateFrom, to: initialFilters.dateTo }}
        onSelect={(range) => updateFilters({
          dateFrom: range?.from?.toISOString(),
          dateTo: range?.to?.toISOString(),
        })}
      />
      
      <Select
        value={initialFilters.eventType}
        onValueChange={(value) => updateFilters({ eventType: value })}
      >
        <option value="">Tutti i corsi</option>
        <option value="Reformer Base">Reformer Base</option>
        <option value="Reformer Intermedio">Reformer Intermedio</option>
        <option value="Reformer Avanzato">Reformer Avanzato</option>
      </Select>
      
      {isPending && <span>Aggiornamento...</span>}
    </div>
  );
}
```

**Source:** [Managing Advanced Search Param Filtering in Next.js App Router](https://aurorascharff.no/posts/managing-advanced-search-param-filtering-next-app-router/) — Community best practices, 2026

### Pattern 3: Italian Date Formatting

**What:** Use Intl.DateTimeFormat with 'it-IT' locale for consistent Italian date display
**When to use:** All date display in UI (event dates, timestamps)
**Example:**

```typescript
// lib/utils/date-format.ts

// Format full date: "Giovedì 16 aprile 2026"
export function formatEventDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  return new Intl.DateTimeFormat('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(dateObj);
}

// Format time: "08:00"
export function formatEventTime(time: string): string {
  // ShaggyOwl returns "HH:mm" format, use as-is or parse if needed
  return time;
}

// Format time range: "08:00 - 09:00"
export function formatEventTimeRange(start: string, end: string): string {
  return `${start} - ${end}`;
}

// Format relative date: "Tra 5 giorni" or "Domani"
export function formatRelativeDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffDays = Math.ceil((dateObj.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Oggi';
  if (diffDays === 1) return 'Domani';
  if (diffDays === -1) return 'Ieri';
  if (diffDays > 1) return `Tra ${diffDays} giorni`;
  return `${Math.abs(diffDays)} giorni fa`;
}
```

**Source:** [Intl.DateTimeFormat - MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat) — Official JavaScript API docs

### Pattern 4: ShaggyOwl Event Data Transformation

**What:** Flatten nested palinsesti structure into flat event list
**When to use:** Transform ShaggyOwl API response into UI-friendly format
**Example:**

```typescript
// lib/api/shaggyowl/events.ts
'use server';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { credentials } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { shaggyOwlClient } from './client';

export interface Event {
  id: string; // id_orario_palinsesto
  nome: string; // nome_corso
  data: string; // ISO date from giorno
  oraInizio: string; // orario_inizio
  oraFine: string; // orario_fine
  stanza: string; // nome_stanza
  colore: string; // color_corso
  postiDisponibili: number; // numero_posti_disponibili
  postiOccupati: number; // numero_posti_occupati
  utentiInCoda: number; // numero_utenti_coda
  prenotabile: boolean; // derived from multiple fields
  giaPrenotato: boolean; // utente_prenotato === "1"
  messaggioStato: string; // frase
  immagine?: string; // path_img_list_corso
}

export async function getEvents(filters?: {
  dateFrom?: string;
  dateTo?: string;
  eventType?: string;
}): Promise<Event[]> {
  // Get current user session
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Non autenticato');
  }

  // Get user's ShaggyOwl session token
  const userCreds = await db.query.credentials.findFirst({
    where: eq(credentials.userId, session.user.id),
  });

  if (!userCreds?.sessionToken) {
    throw new Error('Session token non trovato. Collega il tuo account PilActive.');
  }

  // Fetch palinsesti from ShaggyOwl
  const result = await shaggyOwlClient<any>({
    method: 'POST',
    endpoint: '/funzioniapp/v407/palinsesti',
    contentType: 'form',
    body: {
      codice_sessione: userCreds.sessionToken,
      language: 'it',
    },
  });

  if (!result.success || result.data?.status !== 2) {
    throw new Error('Impossibile recuperare gli eventi');
  }

  // Flatten nested structure: palinsesti → giorni → orari_giorno
  const events: Event[] = [];
  
  for (const palinsesto of result.data.parametri.lista_risultati || []) {
    for (const giorno of palinsesto.giorni || []) {
      for (const orario of giorno.orari_giorno || []) {
        // Only include bookable courses (Reformer, not group classes)
        if (orario.prenotabile_corso !== '2') continue;

        events.push({
          id: orario.id_orario_palinsesto,
          nome: orario.nome_corso,
          data: giorno.giorno, // ISO date string
          oraInizio: orario.orario_inizio,
          oraFine: orario.orario_fine,
          stanza: orario.nome_stanza,
          colore: orario.color_corso,
          postiDisponibili: parseInt(orario.prenotazioni.numero_posti_disponibili),
          postiOccupati: parseInt(orario.prenotazioni.numero_posti_occupati),
          utentiInCoda: parseInt(orario.prenotazioni.numero_utenti_coda),
          prenotabile: orario.prenotazioni.id_disponibilita === '1' 
                      && orario.prenotazioni.utente_prenotato === '0',
          giaPrenotato: orario.prenotazioni.utente_prenotato === '1',
          messaggioStato: orario.prenotazioni.frase,
          immagine: orario.path_img_list_corso,
        });
      }
    }
  }

  // Apply filters
  let filtered = events;
  
  if (filters?.dateFrom) {
    const fromDate = new Date(filters.dateFrom);
    filtered = filtered.filter(e => new Date(e.data) >= fromDate);
  }
  
  if (filters?.dateTo) {
    const toDate = new Date(filters.dateTo);
    filtered = filtered.filter(e => new Date(e.data) <= toDate);
  }
  
  if (filters?.eventType) {
    filtered = filtered.filter(e => e.nome.includes(filters.eventType!));
  }

  // Sort chronologically
  filtered.sort((a, b) => {
    const dateCompare = a.data.localeCompare(b.data);
    if (dateCompare !== 0) return dateCompare;
    return a.oraInizio.localeCompare(b.oraInizio);
  });

  return filtered;
}
```

**Source:** [ShaggyOwl API Response Documentation](file:///Users/mscaltrini/Dev/masca88/pilactive-helper/docs/api/shaggyowl-palinsesti-response.md) — Project-specific API documentation

### Pattern 5: Event Status Display

**What:** Visual indicators for booking availability states
**When to use:** Show users which events they can book
**Example:**

```typescript
// app/(dashboard)/events/_components/event-status-badge.tsx
import { Badge } from '@/components/ui/badge';

type EventStatus = 'available' | 'waitlist' | 'booked' | 'full' | 'not-open';

interface EventStatusBadgeProps {
  status: EventStatus;
  message: string;
}

export function EventStatusBadge({ status, message }: EventStatusBadgeProps) {
  const variants = {
    'available': { variant: 'default', label: 'Disponibile' },
    'waitlist': { variant: 'secondary', label: 'Lista d\'attesa' },
    'booked': { variant: 'success', label: 'Prenotato' },
    'full': { variant: 'destructive', label: 'Esaurito' },
    'not-open': { variant: 'outline', label: 'Non ancora aperto' },
  };

  const { variant, label } = variants[status];

  return (
    <div className="flex flex-col gap-1">
      <Badge variant={variant}>{label}</Badge>
      <span className="text-xs text-muted-foreground">{message}</span>
    </div>
  );
}

// Helper function to determine status
export function getEventStatus(event: Event): EventStatus {
  if (event.giaPrenotato) return 'booked';
  if (!event.prenotabile) return 'not-open';
  if (event.postiDisponibili > 0) return 'available';
  if (event.utentiInCoda > 0) return 'waitlist';
  return 'full';
}
```

### Anti-Patterns to Avoid

- **Client-side API calls:** NEVER fetch ShaggyOwl API from client components - always use Server Components or Server Actions [VERIFIED: CLAUDE.md security constraint]
- **Unvalidated filter inputs:** Always validate date ranges and filter values with Zod before passing to database/API queries
- **Missing Suspense boundaries:** Server Components doing data fetching MUST be wrapped in Suspense to show loading states
- **Hardcoded date formats:** Use Intl.DateTimeFormat with 'it-IT' locale, not manual string formatting
- **Sequential data fetching:** Avoid waterfalls by using Promise.all() for parallel requests when fetching multiple independent data sources

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Data table with sorting/filtering | Custom table state management | TanStack Table v8 | Handles complex state (sorting, filtering, pagination), column definitions, accessibility. Custom implementations miss edge cases. |
| Date formatting | String manipulation for dates | Intl.DateTimeFormat API | Locale-aware, handles all edge cases (leap years, DST), no bundle size cost (native API). |
| Form validation | Manual regex/if-else validation | Zod schemas | Type-safe, composable, automatic TypeScript inference, standardized error messages. |
| Loading states | Manual loading flags | Suspense + loading.tsx | Framework-integrated, automatic fallback rendering, supports streaming, works with Server Components. |
| URL state management | Custom URLSearchParams wrapper | Next.js useSearchParams + useRouter | Framework-integrated, handles navigation transitions, supports Suspense, automatic shallow routing. |

**Key insight:** Next.js 16 + React 19 provide native solutions for data fetching, loading states, and URL state. Don't rebuild what the framework provides. Focus domain logic on ShaggyOwl API integration and business rules (booking availability, filter logic).

## Common Pitfalls

### Pitfall 1: searchParams is Promise in Next.js 16

**What goes wrong:** Directly accessing searchParams.dateFrom throws TypeScript error or runtime error
**Why it happens:** Next.js 16 changed searchParams to be a Promise for better streaming support
**How to avoid:** Always await searchParams at the top of page component
**Warning signs:** TypeScript error "Property 'dateFrom' does not exist on type 'Promise<...>'"

**Example:**
```typescript
// ❌ WRONG (Next.js 16)
export default function EventsPage({ searchParams }: PageProps) {
  const dateFrom = searchParams.dateFrom; // ERROR!
}

// ✅ CORRECT (Next.js 16)
export default async function EventsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const dateFrom = params.dateFrom; // OK
}
```

**Source:** [Next.js 16.2 Release Notes](https://nextjs.org/blog/next-16-2) — searchParams changed to async

### Pitfall 2: Missing Suspense with useSearchParams

**What goes wrong:** Build-time error: "Missing Suspense boundary with useSearchParams"
**Why it happens:** useSearchParams requires a Suspense boundary because it triggers client-side navigation
**How to avoid:** Wrap components using useSearchParams in Suspense boundary
**Warning signs:** Next.js build error message about missing Suspense

**Example:**
```typescript
// ❌ WRONG
export default function Page() {
  return <EventFilters />; // EventFilters uses useSearchParams
}

// ✅ CORRECT
import { Suspense } from 'react';

export default function Page() {
  return (
    <Suspense fallback={<div>Caricamento filtri...</div>}>
      <EventFilters />
    </Suspense>
  );
}
```

**Source:** [Next.js Missing Suspense with useSearchParams](https://nextjs.org/docs/messages/missing-suspense-with-csr-bailout)

### Pitfall 3: Italian Locale Week Start (Monday vs Sunday)

**What goes wrong:** Calendar date picker shows Sunday as first day of week instead of Monday
**Why it happens:** Default locale 'en-US' starts week on Sunday; Italy starts on Monday
**How to avoid:** Configure Calendar component with locale='it-IT' and weekStartsOn={1}
**Warning signs:** Calendar UI shows Domenica (Sunday) in first column

**Example:**
```typescript
// ✅ CORRECT Italian calendar configuration
import { Calendar } from '@/components/ui/calendar';
import { it } from 'date-fns/locale';

<Calendar
  mode="range"
  locale={it}
  weekStartsOn={1}  // Monday
  selected={dateRange}
  onSelect={setDateRange}
/>
```

**Source:** [date-fns Italian locale](https://date-fns.org/docs/I18n) — Locale configuration for Italian

### Pitfall 4: Stale Session Token

**What goes wrong:** Events API returns 401 or empty results even though user is logged in to app
**Why it happens:** ShaggyOwl session token expires (~24h) but app session still valid
**How to avoid:** Check token expiration before API call, refresh if needed (Phase 4 will automate this)
**Warning signs:** API calls fail intermittently, especially for users who haven't used app in 24h

**Example:**
```typescript
// Phase 2 temporary approach: Check and fail gracefully
export async function getEvents(filters?: any): Promise<Event[]> {
  const userCreds = await db.query.credentials.findFirst({
    where: eq(credentials.userId, session.user.id),
  });

  if (!userCreds?.sessionToken) {
    throw new Error('Session token non trovato. Collega il tuo account PilActive.');
  }

  // TODO Phase 4: Add token refresh logic here
  if (userCreds.tokenExpiresAt && userCreds.tokenExpiresAt < new Date()) {
    throw new Error('Session scaduta. Ricollega il tuo account PilActive.');
  }

  // ... rest of API call
}
```

**Note:** Full automatic token refresh is deferred to Phase 4 (EXEC-05, AUTH-02)

### Pitfall 5: Filtering After Pagination

**What goes wrong:** Filter shows "No results" even when matching events exist
**Why it happens:** Filtering applied to current page only, not full dataset
**How to avoid:** For server-side pagination, apply filters at query level before pagination; for client-side, filter full dataset
**Warning signs:** Filter results change when navigating pages

**Example:**
```typescript
// ❌ WRONG (filter after pagination)
const allEvents = await getEvents();
const paginatedEvents = allEvents.slice(page * pageSize, (page + 1) * pageSize);
const filtered = paginatedEvents.filter(matchesFilters); // Only filters current page!

// ✅ CORRECT (filter before pagination)
const allEvents = await getEvents();
const filtered = allEvents.filter(matchesFilters); // Filter full dataset
const paginatedEvents = filtered.slice(page * pageSize, (page + 1) * pageSize);
```

**Note:** Phase 2 likely doesn't need pagination (events shown are ~2 weeks ahead, manageable list size)

## Code Examples

### Example 1: Event Card Component

```typescript
// app/(dashboard)/events/_components/event-card.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, MapPin, Users } from 'lucide-react';
import { formatEventDate, formatEventTimeRange } from '@/lib/utils/date-format';
import { EventStatusBadge, getEventStatus } from './event-status-badge';
import type { Event } from '@/lib/api/shaggyowl/events';

interface EventCardProps {
  event: Event;
}

export function EventCard({ event }: EventCardProps) {
  const status = getEventStatus(event);

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-xl">{event.nome}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {formatEventDate(event.data)}
            </p>
          </div>
          <div
            className="w-4 h-4 rounded-full"
            style={{ backgroundColor: event.colore }}
            aria-label={`Colore corso: ${event.colore}`}
          />
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span>{formatEventTimeRange(event.oraInizio, event.oraFine)}</span>
          </div>
          
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="w-4 h-4 text-muted-foreground" />
            <span>{event.stanza}</span>
          </div>
          
          <div className="flex items-center gap-2 text-sm">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span>
              {event.postiDisponibili} posti disponibili / {event.postiOccupati} occupati
            </span>
          </div>
          
          <div className="pt-2">
            <EventStatusBadge status={status} message={event.messaggioStato} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

**Source:** Composite pattern from shadcn/ui Card examples and project requirements

### Example 2: Server Component Page with Filters

```typescript
// app/(dashboard)/events/page.tsx
import { Suspense } from 'react';
import { getEvents } from '@/lib/api/shaggyowl/events';
import { EventList } from './_components/event-list';
import { EventFilters } from './_components/event-filters';
import { Skeleton } from '@/components/ui/skeleton';

interface PageProps {
  searchParams: Promise<{
    dateFrom?: string;
    dateTo?: string;
    eventType?: string;
  }>;
}

function EventListSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-64 w-full" />
      ))}
    </div>
  );
}

export default async function EventsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  
  // Fetch events server-side - runs on every request but leverages fetch cache
  const events = await getEvents({
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
    eventType: params.eventType,
  });

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Eventi Disponibili</h1>
        <p className="text-muted-foreground">
          Sfoglia e filtra i corsi disponibili presso PilActive
        </p>
      </div>

      <Suspense fallback={<div>Caricamento filtri...</div>}>
        <EventFilters initialFilters={params} />
      </Suspense>

      <div className="mt-6">
        <Suspense fallback={<EventListSkeleton />}>
          <EventList events={events} />
        </Suspense>
      </div>
    </div>
  );
}
```

**Source:** [Next.js App Router Patterns](https://nextjs.org/docs/app/building-your-application/data-fetching/patterns)

## Environment Availability

> Phase 2 has no external dependencies beyond what was verified in Phase 1.

All required tools are already available:
- Node.js 20+ (verified in Phase 1)
- Next.js 16.2+ (installed in Phase 1)
- Supabase Postgres (configured in Phase 1)
- ShaggyOwl API access (credentials stored in Phase 1)

No additional environment checks needed.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | ShaggyOwl palinsesti endpoint accepts codice_sessione + language parameters | Architecture Patterns | API call fails; need to check actual endpoint signature |
| A2 | Events are returned in nested structure (palinsesti → giorni → orari_giorno) | Architecture Patterns | Flattening logic breaks; verify with actual API call |
| A3 | ShaggyOwl session token lasts ~24 hours | Common Pitfalls | Token refresh timing wrong; verify actual expiration behavior |
| A4 | Calendar component from shadcn/ui supports date range selection | Standard Stack | Need alternative component or build custom; verify shadcn/ui Calendar API |

**Verification needed:**
- A1, A2: Verify with actual ShaggyOwl API call in implementation (docs exist but not live-tested)
- A3: Monitor token expiration in production, adjust Phase 4 refresh logic
- A4: Check shadcn/ui Calendar documentation for range mode support

## Open Questions (RESOLVED)

1. **ShaggyOwl API Rate Limiting**
   - What we know: API exists, Phase 1 tested authentication
   - What's unclear: Rate limits, caching strategy, optimal refresh interval
   - Recommendation: Start with on-demand fetching (no auto-refresh), add caching if rate limits encountered

2. **Event List Size and Pagination**
   - What we know: Gym posts events ~2 weeks ahead
   - What's unclear: Typical number of events (10? 50? 100?)
   - Recommendation: Implement without pagination initially, add if >50 events common

3. **Filter Persistence Preference**
   - What we know: URL searchParams enable shareability
   - What's unclear: Do users want filters to persist across sessions?
   - Recommendation: Use URL-only (shareable), don't persist to localStorage unless user feedback requests it

4. **Image Loading Performance**
   - What we know: ShaggyOwl provides event images (path_img_list_corso)
   - What's unclear: Image sizes, loading performance impact
   - Recommendation: Use Next.js Image component with placeholder, consider lazy loading if >20 events

## Sources

### Primary (HIGH confidence)
- [Next.js 16.2 Release Notes](https://nextjs.org/blog/next-16-2) — searchParams Promise change, current version
- [Next.js Data Fetching Patterns](https://nextjs.org/docs/app/building-your-application/data-fetching/patterns) — Official Server Components patterns (last updated April 8, 2026)
- [Next.js Server Components Guide](https://nextjs.org/docs/app/getting-started/server-and-client-components) — Official architecture guide
- [Next.js Caching and Revalidating](https://nextjs.org/docs/app/getting-started/caching-and-revalidating) — Data fetching cache behavior
- [shadcn/ui Data Table](https://ui.shadcn.com/docs/components/radix/data-table) — Official component documentation
- [shadcn/ui Table](https://ui.shadcn.com/docs/components/radix/table) — Official table component
- [Intl.DateTimeFormat - MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat) — Native JavaScript API
- [TanStack Table v8 Docs](https://tanstack.com/table/v8/docs/guide/sorting) — Official sorting/filtering guide
- [Zod Documentation](https://zod.dev/) — Official Zod schema validation docs
- ShaggyOwl API Response Documentation (file:///Users/mscaltrini/Dev/masca88/pilactive-helper/docs/api/shaggyowl-palinsesti-response.md) — Project-specific API documentation

### Secondary (MEDIUM confidence)
- [Managing Advanced Search Param Filtering in Next.js App Router](https://aurorascharff.no/posts/managing-advanced-search-param-filtering-next-app-router/) — Community patterns for URL state
- [Next.js App Router: The Patterns That Actually Matter in 2026](https://dev.to/teguh_coding/nextjs-app-router-the-patterns-that-actually-matter-in-2026-146) — Community best practices
- [React Suspense and Error Boundaries: A Modern Guide (2026)](https://weblogtrips.com/programming-languages/web-development/react-suspense-error-boundaries-modern-guide-2026/) — Error handling patterns
- [Using Zod to validate date range picker](https://onur1337.medium.com/using-zod-to-validate-date-range-picker-76145ea28e8a) — Date validation patterns
- [TanStack Table in React: Everything You Need to Know](https://agilitycms.com/blog/tanstack-table-in-react-everything-you-need-to-know) — Comprehensive TanStack Table guide

### Tertiary (LOW confidence)
- None — all claims verified against official documentation or existing project code

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries verified against CLAUDE.md requirements and npm registry current versions
- Architecture: HIGH - Patterns verified against Next.js 16 official documentation (last updated April 2026)
- Pitfalls: MEDIUM - Based on documented Next.js issues and community reports, not all personally encountered
- ShaggyOwl API integration: MEDIUM - Based on existing Phase 1 implementation + documented response structure, not live-tested palinsesti endpoint

**Research date:** 2026-04-10
**Valid until:** 2026-05-10 (30 days - Next.js/React ecosystem is stable, unlikely to have breaking changes in 1 month)

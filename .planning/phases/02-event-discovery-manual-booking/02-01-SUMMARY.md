---
phase: 02-event-discovery-manual-booking
plan: 01
subsystem: api-client
tags: [api, events, date-formatting, server-side]
dependency_graph:
  requires: [01-03-SUMMARY]
  provides: [event-fetching, date-formatting]
  affects: [event-browsing-ui]
tech_stack:
  added: [Intl.DateTimeFormat]
  patterns: [server-actions, api-transformation, italian-locale]
key_files:
  created:
    - lib/api/shaggyowl/events.ts
    - lib/utils/date-format.ts
  modified:
    - lib/api/shaggyowl/types.ts
decisions:
  - id: D-02-01
    summary: Used Intl.DateTimeFormat for Italian locale formatting
    rationale: Zero-dependency, native browser/Node.js API optimized for i18n
    alternatives: [date-fns, Temporal polyfill]
  - id: D-02-02
    summary: Filter bookable courses with prenotabile_corso === '2'
    rationale: Research identified this flag as indicator for Reformer classes vs group classes
    source: 02-RESEARCH.md
  - id: D-02-03
    summary: Flatten nested API response in getEvents()
    rationale: UI needs flat list, transformation at data layer keeps components simple
    pattern: palinsesti → giorni → orari_giorno → Event[]
metrics:
  duration_minutes: 3
  tasks_completed: 2
  files_created: 2
  files_modified: 1
  commits: 2
  completed_date: "2026-04-10"
---

# Phase 02 Plan 01: Event Fetching & Italian Date Formatting

**One-liner:** ShaggyOwl API extended with server-side event fetching, nested structure transformation to flat Event[], and Italian date formatting utilities using native Intl API.

## What Was Built

### Task 1: ShaggyOwl Events API Client
Created `lib/api/shaggyowl/events.ts` with:
- **getEvents()** server function fetching events from `/funzioniapp/v407/palinsesti`
- **Event interface** with 11 required fields + 1 optional (id, nome, data, oraInizio, oraFine, stanza, colore, postiDisponibili, postiOccupati, utentiInCoda, prenotabile, giaPrenotato, messaggioStato, immagine)
- **Nested structure flattening**: Transforms `lista_risultati → giorni → orari_giorno` to flat Event[]
- **Filtering logic**:
  - Bookable courses only: `prenotabile_corso === '2'` (Reformer classes)
  - Optional filters: dateFrom, dateTo, eventType
- **Chronological sorting**: Events sorted by date, then time using `localeCompare`
- **Server-side authentication**: Uses `await auth()` and queries credentials table for sessionToken
- **Error handling**: Throws meaningful errors for missing auth/session token

### Task 2: Italian Date Formatting Utilities
Created `lib/utils/date-format.ts` with 4 functions:
- **formatEventDate(date)**: Full Italian date with weekday → "giovedì 17 aprile 2026"
- **formatEventTime(time)**: Passthrough (ShaggyOwl already returns "HH:mm")
- **formatEventTimeRange(start, end)**: Time range → "08:00 - 09:00"
- **formatRelativeDate(date)**: Relative dates → "Oggi", "Domani", "Tra 5 giorni"

All using native `Intl.DateTimeFormat('it-IT')` for zero-dependency formatting.

## Deviations from Plan

None - plan executed exactly as written.

## Technical Implementation

### Authentication Pattern (from Phase 1)
```typescript
const session = await auth();
const userCreds = await db.query.credentials.findFirst({
  where: eq(credentials.userId, session.user.id),
});
// Use userCreds.sessionToken for API calls
```

### API Response Transformation
**Input structure:**
```json
{
  "status": 2,
  "parametri": {
    "lista_risultati": [
      { "giorni": [
        { "giorno": "2026-04-17", "orari_giorno": [...] }
      ]}
    ]
  }
}
```

**Output structure:**
```typescript
Event[] = [
  {
    id: "123",
    nome: "Reformer Base",
    data: "2026-04-17",
    oraInizio: "08:00",
    oraFine: "09:00",
    postiDisponibili: 5,
    prenotabile: true,
    // ... other fields
  }
]
```

### Filtering Strategy
1. **Course type filter** (always applied): `prenotabile_corso === '2'`
2. **Date range filter** (optional): `dateFrom <= event.data <= dateTo`
3. **Event type filter** (optional): `event.nome.includes(eventType)`
4. **Chronological sort**: `data.localeCompare() → oraInizio.localeCompare()`

## Threat Surface Analysis

No new threats detected beyond plan's threat model:
- ✅ **T-02-01 (SQL Injection)**: Mitigated with Drizzle ORM parameterized queries
- ✅ **T-02-02 (Spoofing)**: Session token from authenticated session only, server-side
- ✅ **T-02-03 (Information Disclosure)**: Accepted - events are public gym data
- ✅ **T-02-04 (Tampering)**: Accepted - HTTPS transport, parsing validation implicit
- ✅ **T-02-05 (DoS)**: Accepted - rate limiting deferred to Phase 4

## Known Stubs

None. All functions are fully implemented and production-ready.

## Next Steps

**Plan 02-02**: Event Browsing UI
- Use `getEvents()` to fetch and display event list
- Use date formatting utilities for Italian date/time display
- Implement event filtering UI (date range picker, event type selector)
- Display event cards with availability status (prenotabile, giaPrenotato, posti disponibili)

## Requirements Addressed

- **EVENT-01** (partial): Provides server function to fetch chronologically ordered event list ✅
- **EVENT-02** (partial): Event interface includes all required details (time, instructor implied via nome_corso, spots, type) ✅

Full requirement satisfaction pending UI implementation in Plan 02-02.

## Self-Check

Verifying all claims:

**Files created:**
```bash
test -f lib/api/shaggyowl/events.ts && echo "✓ events.ts exists"
test -f lib/utils/date-format.ts && echo "✓ date-format.ts exists"
```

**Commits exist:**
```bash
git log --oneline | grep -q "ab5dcee" && echo "✓ Task 1 commit found"
git log --oneline | grep -q "4fee8c5" && echo "✓ Task 2 commit found"
```

**TypeScript compilation:**
```bash
npx tsc --noEmit && echo "✓ TypeScript compiles without errors"
```

## Self-Check: PASSED

All files created, commits exist, TypeScript compiles successfully.

---

**Commits:**
- `ab5dcee`: feat(02-01): implement getEvents() server function for event fetching
- `4fee8c5`: feat(02-01): add Italian date formatting utilities

**Duration:** 3 minutes
**Status:** ✅ Complete

---
phase: quick-260411-blm
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - lib/inngest/functions/execute-booking.ts
  - lib/utils/booking-calculator.ts
  - app/actions/scheduled-bookings.ts
autonomous: true
requirements: []

must_haves:
  truths:
    - "Bookings are scheduled 5 minutes before the 7-day window opens"
    - "Inngest function retries automatically if booking window not yet open"
    - "System logs retry attempts for debugging and monitoring"
    - "Retry strategy is transparent to users (no UI changes)"
  artifacts:
    - path: "lib/utils/booking-calculator.ts"
      provides: "Configurable advance scheduling with DEFAULT_ADVANCE_MINUTES constant"
      min_lines: 40
    - path: "lib/inngest/functions/execute-booking.ts"
      provides: "Retry logic with step.sleep for rapid retry (30s intervals, max 10 attempts)"
      min_lines: 120
    - path: "app/actions/scheduled-bookings.ts"
      provides: "scheduleBooking action using anticipatory scheduling"
      min_lines: 200
  key_links:
    - from: "scheduleBooking()"
      to: "calculateBookingTime()"
      via: "Pass DEFAULT_ADVANCE_MINUTES parameter"
      pattern: "calculateBookingTime\\(.*DEFAULT_ADVANCE_MINUTES\\)"
    - from: "executeBooking step 'book-event'"
      to: "step.sleep()"
      via: "Retry loop with 30s sleep on 'window not open' error"
      pattern: "step\\.sleep.*30s"
---

<objective>
Implementare una strategia di scheduling anticipato per migliorare l'affidabilità delle prenotazioni automatiche. Invece di schedulare esattamente 7 giorni prima dell'evento, si schedulerà qualche minuto prima con retry rapidi se la finestra di prenotazione non è ancora aperta, garantendo che la prenotazione venga eseguita il prima possibile.

**Purpose:** Aumentare la probabilità di successo delle prenotazioni automatiche compensando possibili ritardi di schedulazione di Inngest o aperture anticipate della finestra di prenotazione.

**Output:** Sistema di scheduling modificato con tentativo anticipato e retry automatici configurabili.
</objective>

<execution_context>
@/Users/mscaltrini/Dev/masca88/pilactive-helper/.claude/get-shit-done/workflows/execute-plan.md
@/Users/mscaltrini/Dev/masca88/pilactive-helper/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
**Current Implementation:**
- Bookings scheduled exactly 7 days before event using `calculateBookingTime()`
- Inngest executes booking at scheduled timestamp using `ts` parameter
- No retry logic if booking window not yet open
- Single execution attempt via `executeBooking` function

**Stack:**
- Inngest 3.0+ with step functions and retry capabilities
- Temporal API for DST-safe date calculations (Europe/Rome timezone)
- Drizzle ORM with Postgres for booking status tracking

**Key Files:**
@lib/inngest/functions/execute-booking.ts
@lib/utils/booking-calculator.ts
@app/actions/scheduled-bookings.ts
@lib/db/schema/scheduled-bookings.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Aggiungere configurazione per scheduling anticipato</name>
  <files>lib/utils/booking-calculator.ts</files>
  <action>
Modificare `calculateBookingTime()` per supportare un anticipo configurabile:

1. Aggiungere parametro opzionale `advanceMinutes` (default: 5 minuti)
2. Sottrarre i minuti di anticipo dal timestamp calcolato: `bookingTime.subtract({ days: 7, minutes: advanceMinutes })`
3. Aggiungere commento che spiega la strategia: "Schedule slightly before to account for Inngest scheduling jitter and early booking window opening"
4. Mantenere la preservazione del local time per DST con Temporal API

Esportare anche una costante `DEFAULT_ADVANCE_MINUTES = 5` per uso condiviso.
  </action>
  <verify>
    <automated>npm run build</automated>
  </verify>
  <done>calculateBookingTime() accetta parametro advanceMinutes e sottrae correttamente i minuti dal timestamp</done>
</task>

<task type="auto">
  <name>Task 2: Implementare retry rapido in Inngest function</name>
  <files>lib/inngest/functions/execute-booking.ts</files>
  <action>
Modificare `executeBooking` function per gestire la finestra di prenotazione non ancora aperta:

1. Avvolgere lo step "book-event" in logica di retry:
   - Catturare errori che indicano "booking window not open yet" (controllare messaggio errore ShaggyOwl API)
   - Se errore è "window not open", ritentare dopo 30 secondi usando `step.sleep("wait-for-window", "30s")`
   - Massimo 10 retry (5 minuti totali di attesa)
   - Se tutti i retry falliscono, marcare come "failed" con errorMessage specifico

2. Aggiungere nuovo step "check-booking-window" PRIMA di "book-event":
   - Verificare se executeAt è nel passato (finestra dovrebbe essere aperta)
   - Se executeAt è nel futuro, attendere con `step.sleep()` fino al timestamp
   - Questo gestisce il caso di anticipo schedulato

3. Aggiungere logging per diagnostica:
   - Log del tentativo corrente (1/10, 2/10, etc.)
   - Log del motivo del retry
   - Log se si sta attendendo l'apertura della finestra

NOTA: NON usare Inngest retry configuration a livello di function (troppo lento), usare step.sleep() per retry rapidi custom.
  </action>
  <verify>
    <automated>npm run build && grep -q "step.sleep" lib/inngest/functions/execute-booking.ts</automated>
  </verify>
  <done>Inngest function implementa retry rapido con sleep di 30s, max 10 tentativi, con logging chiaro dello stato</done>
</task>

<task type="auto">
  <name>Task 3: Aggiornare scheduleBooking action per usare anticipo</name>
  <files>app/actions/scheduled-bookings.ts</files>
  <action>
Modificare `scheduleBooking()` Server Action per usare il nuovo anticipo:

1. Importare `DEFAULT_ADVANCE_MINUTES` da booking-calculator
2. Passare `advanceMinutes` a `calculateBookingTime()`: `calculateBookingTime(eventStartTime, DEFAULT_ADVANCE_MINUTES)`
3. Aggiornare commento che spiega executeAt: "Calculate executeAt: 7 days before event at same local time, minus 5 minutes for anticipatory scheduling"
4. Mantenere validazione che executeAt deve essere nel futuro

Nessun cambiamento all'interfaccia utente - il comportamento è trasparente per l'utente.
  </action>
  <verify>
    <automated>npm run build && grep -q "DEFAULT_ADVANCE_MINUTES" app/actions/scheduled-bookings.ts</automated>
  </verify>
  <done>scheduleBooking() usa calculateBookingTime() con anticipo configurato, executeAt è 7 giorni meno 5 minuti</done>
</task>

</tasks>

<verification>
**Manual Testing:**
1. Schedule a test booking for an event 8+ days away (to satisfy constraints)
2. Verify database `executeAt` is ~7 days minus 5 minutes before event
3. Check Inngest dashboard shows scheduled event with correct timestamp
4. Simulate "window not open" error in bookEvent() to verify retry logic activates
5. Verify logs show retry attempts with 30s intervals

**Automated Checks:**
- Build passes without TypeScript errors
- Temporal API still preserves DST-safe calculations
- Database schema unchanged (backward compatible)
</verification>

<success_criteria>
- [ ] `calculateBookingTime()` supporta parametro `advanceMinutes` opzionale
- [ ] Timestamp calcolato è 7 giorni meno i minuti di anticipo dall'evento
- [ ] Inngest function implementa retry rapido (30s interval, max 10 tentativi)
- [ ] Retry si attiva solo per errori "booking window not open"
- [ ] Logging chiaro dello stato di retry (1/10, 2/10, etc.)
- [ ] `scheduleBooking()` usa DEFAULT_ADVANCE_MINUTES (5 minuti)
- [ ] Comportamento trasparente per utente (nessuna UI change necessaria)
- [ ] Build passa, TypeScript strict mode soddisfatto
</success_criteria>

<output>
After completion, create `.planning/quick/260411-blm-implementare-strategia-di-scheduling-ant/260411-blm-SUMMARY.md`
</output>

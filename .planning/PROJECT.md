# PilActive Helper

## What This Is

Un'applicazione web che automatizza le prenotazioni agli eventi della palestra PilActive Sesto San Giovanni. Gli utenti possono selezionare eventi futuri e l'app prenota automaticamente esattamente 7 giorni prima (stesso giorno e ora) quando si apre la finestra di prenotazione, garantendo il posto prima che si riempia.

## Core Value

Prenotare automaticamente gli slot di Pilates esattamente quando si aprono le prenotazioni (7 giorni prima), prima che si riempiano.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] User può autenticarsi con credenziali PilActive (email/password)
- [ ] User può vedere eventi disponibili in lista cronologica per data
- [ ] User può selezionare eventi futuri e schedulare prenotazione automatica
- [ ] Sistema prenota automaticamente esattamente 7 giorni prima dell'evento (stesso orario)
- [ ] User può configurare pattern ricorrenti (es: "Pilates Reformer ogni Martedì 18:00")
- [ ] User può vedere prenotazioni automatiche schedulate
- [ ] User può cancellare prenotazioni automatiche prima dell'esecuzione
- [ ] Sistema fa retry automatico se prenotazione fallisce
- [ ] User riceve notifiche quando prenotazione automatica ha successo/fallisce
- [ ] Multi-utente: ogni utente gestisce le proprie credenziali e prenotazioni

### Out of Scope

- Test su prenotazioni reali senza autorizzazione — solo API di produzione con cautela
- Prenotazioni su eventi troppo vicini (< 2 giorni) durante test
- Gestione centralizzata credenziali (ogni utente inserisce le proprie)
- App mobile nativa — solo web app

## Context

### API della Palestra (ShaggyOwl)

L'app interagisce con API di produzione su https://app.shaggyowl.com:

**Autenticazione:**
- Endpoint: POST accesso-cliente (da verificare endpoint esatto)
- Ritorna `codice_sessione` usato per tutte le richieste successive
- Credenziali test: gigante.margherita@gmail.com / Pallino1

**Eventi (Palinsesto):**
- Endpoint: POST `/funzioniapp/v407/palinsesti`
- Parametri: `id_sede=12027`, `codice_sessione`, `giorno=YYYY-MM-DD`
- Ritorna lista eventi per data specifica

**Prenotazione:**
- Endpoint: POST `/funzioniapp/v407/prenotazione_new`
- Parametri: `id_sede=12027`, `codice_sessione`, `id_orario_palinsesto`, `data`
- Esegue prenotazione immediata

**Cancellazione:**
- Endpoint: POST `/funzioniapp/v407/cancella_prenotazione`
- Parametri: `id_sede=12027`, `codice_sessione`, `id_prenotazione`, `tipo=prenotazione`

### Regole di Prenotazione

- Le prenotazioni si aprono esattamente 7 giorni prima dell'evento
- Se evento è Lunedì 21 aprile ore 18:00, prenotazioni aprono Lunedì 14 aprile ore 18:00
- Gli slot si riempiono rapidamente, servono prenotazioni immediate all'apertura
- Pattern ricorrenti: stesso slot ogni settimana (es: Pilates Reformer Martedì 18:00)

### Utenti Target

- Utente principale + famiglia/amici (pochi utenti)
- Ogni utente ha account separato PilActive
- Ogni utente gestisce le proprie credenziali e prenotazioni
- Non è un servizio pubblico aperto a tutti

### Considerazioni Tecniche

- Chiamate API devono essere server-to-server (non dal browser)
- Necessità di job scheduler per eseguire prenotazioni al momento esatto
- Sistema deve essere affidabile (cloud hosting sempre attivo)
- Gestione sessioni: codice_sessione potrebbe scadere, serve refresh
- Fusi orari: eventi e scheduling devono essere sincronizzati (timezone Italia)

## Constraints

- **Stack Frontend**: React + Next.js + shadcn/ui (obbligatorio)
- **API Calls**: Server-to-server tramite Next.js API routes/server actions (non client-side)
- **Testing**: MAI prenotare eventi < 2 giorni da oggi in test
- **Testing**: MAI testare senza autorizzazione esplicita (API di produzione reali)
- **Deployment**: Cloud hosting (Vercel consigliato per Next.js)
- **Job Scheduling**: Necessario sistema affidabile per eseguire prenotazioni al timestamp esatto

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Next.js App Router | API routes per chiamate server-side + supporto Vercel per scheduling | — Pending |
| shadcn/ui components | UI moderna e accessibile richiesta dall'utente | — Pending |
| Database per scheduling | Necessario persistere prenotazioni schedulate e gestire multi-utente | — Pending |
| Vercel Cron Jobs | Scheduling affidabile per eseguire prenotazioni al momento esatto | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-09 after initialization*

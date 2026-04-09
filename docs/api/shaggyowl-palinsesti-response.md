# ShaggyOwl API - Risposta Palinsesti

## Endpoint
Probabilmente: `GET /api/palinsesti` o simile (da confermare)

## Struttura Generale della Risposta

```typescript
{
  status: number;          // 2 = successo
  messaggio: string;       // "Tutto bene"
  parametri: {
    lista_risultati: Palinsesto[]
  }
}
```

## Struttura Palinsesto

Ogni palinsesto rappresenta una categoria di corsi (es. "Group Reformer", "YOGA").

```typescript
interface Palinsesto {
  id_palinsesti: string;           // ID del palinsesto (es. "59534")
  nome_palinsesto: string;         // Nome (es. "Group Reformer", "YOGA")
  visibile: "1" | "2";            // 2 = visibile
  principale: "1" | "2";          // 1 = principale, 2 = secondario
  tipo: "palinsesto";
  id_cliente: "0";
  is_all_visible: "2";
  giorni: Giorno[];               // Array di giorni con orari
  
  // Campi sempre vuoti nell'esempio
  idclienti: "";
  note: "";
  idclienti_array: [];
  tagsc: [];
  tagsc_value: "";
  tagsa: [];
  tagsa_value: "";
}
```

## Struttura Giorno

Ogni giorno contiene gli orari/corsi disponibili per quella data.

```typescript
interface Giorno {
  giorno: string;                 // Data ISO: "2026-04-16"
  nome_giorno: string;            // Nome localizzato: "Giovedì 16/04/2026"
  orari_giorno: OrarioCorso[];    // Array di corsi/slot (può essere vuoto)
}
```

## Struttura OrarioCorso

Ogni slot rappresenta una lezione specifica.

```typescript
interface OrarioCorso {
  // Identificatori
  id_orario_palinsesto: string;   // ID univoco dello slot (es. "9384876")
  id_disponibilita: "0" | "1";    // 0 = non disponibile, 1 = disponibile
  
  // Informazioni Corso
  nome_corso: string;              // Nome del corso (es. "Reformer Base")
  color_corso: string;             // Colore hex (es. "#C391E3")
  prenotabile_corso: "1" | "2";   // 1 = non prenotabile, 2 = prenotabile
  iscrizioni: "1" | "2";          // 1 = chiuse, 2 = aperte
  ingressi_corso: "1";
  
  // Orari
  orario_inizio: string;           // Formato HH:mm (es. "07:30")
  orario_fine: string;             // Formato HH:mm (es. "08:30")
  
  // Location
  nome_stanza: string;             // Es. "Reformer", "Corsi di Gruppo"
  nome_campo: string;              // Solitamente vuoto
  via: string;                     // Indirizzo (solitamente vuoto)
  lat: string;                     // Latitudine (solitamente vuoto)
  lon: string;                     // Longitudine (solitamente vuoto)
  
  // Modalità
  is_online: "1";                  // 1 = online disponibile
  no_greenpass: "1";               // 1 = non richiede green pass
  a_crediti: "1";                  // 1 = a crediti
  crediti: "0";                    // Numero crediti richiesti
  
  // Prezzo
  prezzo: string;                  // Formato decimale (es. "0.00")
  
  // Immagini
  path_img_corso: string;          // URL immagine principale
  path_img_list_corso: string;     // URL immagine lista (152x152)
  path_img_inner_corso: string;    // URL immagine interna (250x640)
  path_img_big_corso: string;      // URL immagine grande
  path_img_small_corso: string;    // URL immagine piccola
  
  // Staff (solitamente null/vuoto)
  staff: null;
  nome_staff: string;
  nome_staff_secondario: string;
  
  // Altre informazioni
  nota: string;                    // Note (solitamente vuoto)
  blocco_coda: 0;
  multimedia: "1";
  
  // PRENOTAZIONI - Informazioni cruciali per il booking
  prenotazioni: {
    numero_posti_disponibili: string;    // Es. "0", "12", "4"
    numero_utenti_coda: string;          // Utenti in coda d'attesa
    numero_utenti_attesa: string;        // Utenti in attesa
    numero_posti_occupati: string;       // Posti già prenotati
    id_disponibilita: "0" | "1";        // 0 = chiuso, 1 = aperto
    nota: string;                        // Note (solitamente vuoto)
    utente_prenotato: "0" | "1";        // 0 = non prenotato, 1 = già prenotato
    frase: string;                       // Messaggio UI
    prenota_coda: "1" | "2";            // 1 = prenota in coda, 2 = prenota normalmente
    in_coda: "1";
  }
}
```

## Stati delle Prenotazioni

### Prenotazioni Aperte
```json
{
  "numero_posti_disponibili": "4",
  "numero_utenti_coda": "0",
  "numero_posti_occupati": "8",
  "id_disponibilita": "1",
  "utente_prenotato": "0",
  "frase": "4 posti disponibili",
  "prenota_coda": "2"
}
```
**Stato:** ✅ Prenotabile normalmente

### Prenotazioni Chiuse con Coda
```json
{
  "numero_posti_disponibili": "0",
  "numero_utenti_coda": "3",
  "numero_posti_occupati": "12",
  "id_disponibilita": "1",
  "utente_prenotato": "0",
  "frase": "3 utenti in coda",
  "prenota_coda": "1"
}
```
**Stato:** ⏳ Prenotabile solo in coda d'attesa

### Prenotazioni Non Ancora Aperte
```json
{
  "numero_posti_disponibili": "12",
  "numero_utenti_coda": "0",
  "numero_posti_occupati": "0",
  "id_disponibilita": "0",
  "utente_prenotato": "0",
  "frase": "Le prenotazioni apriranno il 10-04-2026 alle 08:00",
  "prenota_coda": "2"
}
```
**Stato:** 🔒 Prenotazioni non ancora aperte (7 giorni prima)

### Corso Non Prenotabile
```json
{
  "numero_posti_disponibili": "0",
  "numero_utenti_coda": "0",
  "numero_posti_occupati": "0",
  "id_disponibilita": "0",
  "utente_prenotato": "0",
  "frase": "Corso non prenotabile",
  "prenota_coda": "2"
}
```
**Stato:** ❌ Corso non prenotabile (es. corsi di gruppo non Reformer)

### Già Prenotato
```json
{
  "utente_prenotato": "1",
  "frase": "Prenotato"
}
```
**Stato:** ✓ Già prenotato dall'utente

## Logica di Prenotabilità

Un corso è **prenotabile** quando:
1. `prenotabile_corso === "2"` (corso prenotabile online)
2. `iscrizioni === "2"` (iscrizioni aperte)
3. `prenotazioni.id_disponibilita === "1"` (prenotazioni aperte)
4. `prenotazioni.utente_prenotato === "0"` (non già prenotato)

Un corso è **prenotabile in coda** quando:
1. Tutti i criteri sopra sono soddisfatti
2. `prenotazioni.numero_posti_disponibili === "0"`
3. `prenotazioni.prenota_coda === "1"`

## Esempio Completo - Corso Prenotabile

```json
{
  "id_orario_palinsesto": "9384884",
  "nome_corso": "Reformer Intermedio",
  "color_corso": "#39B771",
  "orario_inizio": "11:30",
  "orario_fine": "12:30",
  "nome_stanza": "Reformer",
  "prenotabile_corso": "2",
  "iscrizioni": "2",
  "prenotazioni": {
    "numero_posti_disponibili": "4",
    "numero_utenti_coda": "0",
    "numero_posti_occupati": "8",
    "id_disponibilita": "1",
    "utente_prenotato": "0",
    "frase": "4 posti disponibili",
    "prenota_coda": "2"
  }
}
```

## Esempio Completo - Corso Non Ancora Prenotabile

```json
{
  "id_orario_palinsesto": "9442353",
  "nome_corso": "Reformer Cardio Tone",
  "color_corso": "#F0A244",
  "orario_inizio": "08:00",
  "orario_fine": "09:00",
  "nome_stanza": "Reformer",
  "prenotabile_corso": "2",
  "iscrizioni": "2",
  "prenotazioni": {
    "numero_posti_disponibili": "12",
    "numero_utenti_coda": "0",
    "numero_posti_occupati": "0",
    "id_disponibilita": "0",
    "utente_prenotato": "0",
    "frase": "Le prenotazioni apriranno il 10-04-2026 alle 08:00",
    "prenota_coda": "2"
  }
}
```

## Tipi di Corsi

### Reformer (Prenotabili)
- Reformer Base
- Reformer Intermedio
- Reformer Avanzato
- Reformer Cardio Tone

**Caratteristiche:**
- `prenotabile_corso: "2"`
- `nome_stanza: "Reformer"`
- Posti limitati (solitamente 12)
- Prenotazione online obbligatoria

### Corsi di Gruppo (Non Prenotabili Online)
- Pilates Ring
- Pilates FitBall
- Pilates Matwork
- Pilates SoftBall
- Pilates Foam Roller
- Pilates Functional
- Pilates Dynamo
- Pilates Elastic Band
- Hatha Yoga
- Vinyasa Yoga
- Meditation

**Caratteristiche:**
- `prenotabile_corso: "1"`
- `nome_stanza: "Corsi di Gruppo"`
- Frase sempre: "Corso non prenotabile"
- Accesso libero senza prenotazione

## Regola dei 7 Giorni

Le prenotazioni si aprono esattamente **7 giorni prima** alla stessa ora del corso.

**Esempio:**
- Corso: Venerdì 17/04/2026 ore 08:00
- Apertura prenotazioni: Venerdì 10/04/2026 ore 08:00

**Campo relevante:**
```json
"frase": "Le prenotazioni apriranno il 10-04-2026 alle 08:00"
```

## Note Implementative

### Per Visualizzare gli Eventi
1. Filtrare `prenotabile_corso === "2"` per mostrare solo Reformer
2. Controllare `prenotazioni.id_disponibilita` per capire se già prenotabile
3. Usare `prenotazioni.frase` per mostrare lo stato all'utente
4. Colorare gli eventi usando `color_corso`

### Per la Prenotazione Automatica
1. Identificare eventi con `id_disponibilita === "0"` (non ancora aperti)
2. Parsare il messaggio `frase` per estrarre data/ora apertura
3. Calcolare il timestamp esatto: **7 giorni prima, stessa ora**
4. Schedulare job Inngest per quel timestamp
5. Al trigger, chiamare API di prenotazione con `id_orario_palinsesto`

### Gestione Stati UI
```typescript
function getEventStatus(corso: OrarioCorso) {
  const { prenotazioni, prenotabile_corso } = corso;
  
  if (prenotabile_corso !== "2") {
    return "NON_PRENOTABILE"; // Corso di gruppo
  }
  
  if (prenotazioni.utente_prenotato === "1") {
    return "GIA_PRENOTATO";
  }
  
  if (prenotazioni.id_disponibilita === "0") {
    return "NON_ANCORA_APERTO"; // < 7 giorni
  }
  
  if (prenotazioni.numero_posti_disponibili !== "0") {
    return "PRENOTABILE"; // Posti disponibili
  }
  
  if (prenotazioni.prenota_coda === "1") {
    return "CODA_DISPONIBILE"; // Solo coda
  }
  
  return "COMPLETO"; // Tutto esaurito
}
```

## Campi da Utilizzare

### Essenziali per Booking
- `id_orario_palinsesto` - ID per la prenotazione
- `nome_corso` - Display name
- `orario_inizio`, `orario_fine` - Orari
- `giorno` - Data evento
- `prenotazioni.id_disponibilita` - Se prenotabile ora
- `prenotazioni.utente_prenotato` - Se già prenotato
- `prenotazioni.frase` - Messaggio per utente

### Utili per UI
- `color_corso` - Colore tema
- `nome_stanza` - Location
- `path_img_list_corso` - Icona corso
- `prenotazioni.numero_posti_disponibili` - Count posti
- `prenotazioni.numero_utenti_coda` - Count coda

### Da Ignorare (sempre vuoti/null)
- `staff`, `nome_staff`, `nome_staff_secondario`
- `via`, `lat`, `lon`
- `nota`
- Tutti i campi `tags*`

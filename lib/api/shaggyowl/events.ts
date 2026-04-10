'use server';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { credentials } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { shaggyOwlClient } from './client';
import type { ApiResult } from './types';

export interface Event {
  id: string;                    // id_orario_palinsesto
  nome: string;                  // nome_corso
  data: string;                  // ISO date da giorno
  oraInizio: string;             // orario_inizio (formato "HH:mm")
  oraFine: string;               // orario_fine
  stanza: string;                // nome_stanza
  colore: string;                // color_corso (hex code)
  postiDisponibili: number;      // numero_posti_disponibili (parsed to number)
  postiOccupati: number;         // numero_posti_occupati (parsed to number)
  utentiInCoda: number;          // numero_utenti_coda (parsed to number)
  prenotabile: boolean;          // derived: id_disponibilita === '1' && utente_prenotato === '0'
  giaPrenotato: boolean;         // utente_prenotato === '1'
  messaggioStato: string;        // frase
  immagine?: string;             // path_img_list_corso (optional)
}

/**
 * Fetches events from ShaggyOwl API and transforms them into a flat list
 * @param filters Optional filters for dateFrom, dateTo, and eventType
 * @returns Array of Event objects sorted chronologically
 */
export async function getEvents(filters?: {
  dateFrom?: string;
  dateTo?: string;
  eventType?: string;
}): Promise<Event[]> {
  // Get current session
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error('Non autenticato');
  }

  // Query credentials table to get user's session token and cookies
  const userCreds = await db.query.credentials.findFirst({
    where: eq(credentials.userId, session.user.id),
  });

  if (!userCreds?.sessionToken) {
    throw new Error('Session token non trovato. Collega il tuo account PilActive dalle impostazioni.');
  }

  // Call ShaggyOwl API to fetch palinsesti (schedule)
  const result = await shaggyOwlClient<any>({
    method: 'POST',
    endpoint: '/funzioniapp/v407/palinsesti',
    contentType: 'form',
    body: {
      id_sede: '12027', // PilActive Sesto San Giovanni
      codice_sessione: userCreds.sessionToken,
      giorno: new Date().toISOString().split('T')[0], // Current date in YYYY-MM-DD format
    },
    cookies: userCreds.sessionCookies || undefined, // Pass HTTP cookies for session persistence
  });

  if (!result.success || result.data?.status !== 2) {
    throw new Error('Impossibile recuperare gli eventi dalla palestra');
  }

  // Flatten nested structure (palinsesti → giorni → orari)
  const events: Event[] = [];

  const listaRisultati = result.data?.parametri?.lista_risultati || [];

  for (const palinsesto of listaRisultati) {
    const giorni = palinsesto.giorni || [];

    for (const giorno of giorni) {
      const orariGiorno = giorno.orari_giorno || [];

      for (const orario of orariGiorno) {
        // Filter: only include bookable courses (prenotabile_corso === '2' indicates Reformer classes)
        if (orario.prenotabile_corso !== '2') {
          continue;
        }

        // Map to Event interface with proper parsing
        const event: Event = {
          id: orario.id_orario_palinsesto,
          nome: orario.nome_corso,
          data: giorno.giorno, // ISO date format
          oraInizio: orario.orario_inizio,
          oraFine: orario.orario_fine,
          stanza: orario.nome_stanza,
          colore: orario.color_corso,
          postiDisponibili: parseInt(orario.prenotazioni.numero_posti_disponibili, 10),
          postiOccupati: parseInt(orario.prenotazioni.numero_posti_occupati, 10),
          utentiInCoda: parseInt(orario.prenotazioni.numero_utenti_coda, 10),
          prenotabile: orario.prenotazioni.id_disponibilita === '1' && orario.prenotazioni.utente_prenotato === '0',
          giaPrenotato: orario.prenotazioni.utente_prenotato === '1',
          messaggioStato: orario.prenotazioni.frase,
          immagine: orario.path_img_list_corso || undefined,
        };

        events.push(event);
      }
    }
  }

  // Apply filters
  let filtered = events;

  if (filters?.dateFrom) {
    const dateFrom = new Date(filters.dateFrom);
    filtered = filtered.filter(e => new Date(e.data) >= dateFrom);
  }

  if (filters?.dateTo) {
    const dateTo = new Date(filters.dateTo);
    filtered = filtered.filter(e => new Date(e.data) <= dateTo);
  }

  if (filters?.eventType) {
    filtered = filtered.filter(e => e.nome.includes(filters.eventType!));
  }

  // Sort chronologically (by date, then by time)
  filtered.sort((a, b) => {
    const dateCompare = a.data.localeCompare(b.data);
    if (dateCompare !== 0) return dateCompare;
    return a.oraInizio.localeCompare(b.oraInizio);
  });

  return filtered;
}

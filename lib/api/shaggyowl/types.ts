import { z } from 'zod';

// Authentication request
export const authRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  id_sede: z.number().default(12027), // PilActive Sesto San Giovanni
});

export type AuthRequest = z.infer<typeof authRequestSchema>;

// Authentication response
export const authResponseSchema = z.object({
  success: z.boolean(),
  codice_sessione: z.string().optional(),
  message: z.string().optional(),
  error: z.string().optional(),
});

export type AuthResponse = z.infer<typeof authResponseSchema>;

// Generic API response wrapper
export type ApiResult<T> = {
  success: boolean;
  data?: T;
  error?: string;
  cookies?: string; // Session cookies for subsequent requests
};

// Booking response (from /funzioniapp/v407/prenotazione_new)
export const BookingResponseSchema = z.object({
  success: z.boolean().optional(),
  messaggio: z.string().optional(),
  error: z.string().optional(),
  id_prenotazione: z.string().optional(), // Booking confirmation ID if successful
});

export type BookingResponse = z.infer<typeof BookingResponseSchema>;

/**
 * Determines if a booking was successful based on multiple signals:
 * - Explicit success field
 * - Success patterns in message content
 * - Absence of error field
 * - Absence of failure patterns in message
 *
 * @param response - BookingResponse from ShaggyOwl API
 * @returns true if booking was successful, false otherwise
 */
export function isBookingSuccessful(response: BookingResponse): boolean {
  // Primary check: explicit success field
  if (response.success === true) {
    return true;
  }

  // Failure check: error field present
  if (response.error && response.error.trim().length > 0) {
    return false;
  }

  // Check message content patterns
  const message = (response.messaggio || '').toLowerCase();

  // Failure patterns (check first - these take precedence)
  const failurePatterns = [
    'già prenotato',
    'posti esauriti',
    'non disponibile',
    'prenotazione fallita',
    'impossibile prenotare',
  ];

  for (const pattern of failurePatterns) {
    if (message.includes(pattern)) {
      return false;
    }
  }

  // Success patterns (only trust if no failure patterns found)
  const successPatterns = [
    'complimenti ti sei registrato correttamente',
    'prenotazione confermata',
    'registrato con successo',
    'prenotazione effettuata',
  ];

  for (const pattern of successPatterns) {
    if (message.includes(pattern)) {
      return true;
    }
  }

  // Default: if success field is explicitly false or undefined, treat as failure
  return false;
}

// Re-export Event type from events module
export type { Event } from './events';

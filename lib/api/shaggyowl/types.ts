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
};

// Re-export Event type from events module
export type { Event } from './events';

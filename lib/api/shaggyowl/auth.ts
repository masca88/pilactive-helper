'use server';

import { db } from '@/lib/db';
import { credentials } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { shaggyOwlClient } from './client';
import {
  authRequestSchema,
  authResponseSchema,
  type ApiResult,
} from './types';

export async function authenticateWithShaggyOwl(
  userId: string,
  email: string,
  password: string
): Promise<ApiResult<{ sessionToken: string }>> {
  // Validate inputs
  const validated = authRequestSchema.safeParse({
    email,
    password,
    id_sede: 12027,
  });

  if (!validated.success) {
    return {
      success: false,
      error: 'Invalid credentials format',
    };
  }

  // Step 0: Initialize session by visiting homepage to get PHP session cookie
  const initResult = await shaggyOwlClient<any>({
    method: 'GET',
    endpoint: '/accesso-cliente/index.html',
  });

  // Extract PHP session cookie from init response
  const sessionCookie = initResult.cookies || '';

  // Step 1: Login to get initial session token (with PHP session cookie)
  const loginResult = await shaggyOwlClient<any>({
    method: 'POST',
    endpoint: '/funzioniapp/v407/loginApp',
    contentType: 'form',
    body: {
      mail: validated.data.email,
      pass: validated.data.password,
      versione: '44',
      tipo: 'web',
      langauge: 'it', // Note: typo in ShaggyOwl API
    },
    cookies: sessionCookie, // Pass PHP session cookie
  });

  if (!loginResult.success) {
    return { success: false, error: loginResult.error };
  }

  const loginData = loginResult.data;
  if (!loginData?.parametri?.sessione?.codice_sessione) {
    return {
      success: false,
      error: 'No session token in login response',
    };
  }

  const initialSessionToken = loginData.parametri.sessione.codice_sessione;
  // Keep the PHP session cookie from homepage, not from login (which doesn't set cookies)
  const phpSessionCookie = sessionCookie || loginResult.cookies;

  // Step 2: Select sede (gym location) to complete authentication
  const sedeResult = await shaggyOwlClient<any>({
    method: 'POST',
    endpoint: '/funzioniapp/v407/selezionaSede',
    contentType: 'form',
    body: {
      id_sede_selezionata: '12027', // PilActive Sesto San Giovanni
      codice_sessione: initialSessionToken,
      language: 'it',
    },
    cookies: phpSessionCookie, // Pass PHP session cookie from homepage
  });

  if (!sedeResult.success) {
    return { success: false, error: sedeResult.error };
  }

  const sedeData = sedeResult.data;
  if (sedeData?.status !== 2) {
    return {
      success: false,
      error: sedeData?.messaggio || 'Sede selection failed',
    };
  }

  const sessionToken = sedeData.parametri?.sessione?.codice_sessione;
  // Always use the PHP session cookie from homepage (it doesn't change across requests)
  const finalCookies = phpSessionCookie;

  if (!sessionToken) {
    return {
      success: false,
      error: 'No session token in sede response',
    };
  }

  // Store credentials, session token, and cookies in database (D-03)
  try {
    // Check if credentials already exist for this user
    const existing = await db.query.credentials.findFirst({
      where: eq(credentials.userId, userId),
    });

    if (existing) {
      // Update existing credentials
      await db
        .update(credentials)
        .set({
          pilactiveEmail: email,
          pilactivePassword: password, // TODO: Encrypt in Phase 4
          sessionToken,
          sessionCookies: finalCookies, // Store HTTP cookies for session persistence
          tokenExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h estimate
          updatedAt: new Date(),
        })
        .where(eq(credentials.userId, userId));
    } else {
      // Insert new credentials
      await db.insert(credentials).values({
        userId,
        pilactiveEmail: email,
        pilactivePassword: password, // TODO: Encrypt in Phase 4
        sessionToken,
        sessionCookies: finalCookies, // Store HTTP cookies for session persistence
        tokenExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h estimate
      });
    }

    return {
      success: true,
      data: { sessionToken },
    };
  } catch (error) {
    return {
      success: false,
      error: 'Failed to store credentials in database',
    };
  }
}

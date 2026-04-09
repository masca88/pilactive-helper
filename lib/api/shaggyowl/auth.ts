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

  // Call ShaggyOwl authentication endpoint
  // Note: Endpoint path verified from PROJECT.md - may need adjustment
  const result = await shaggyOwlClient<unknown>({
    method: 'POST',
    endpoint: '/funzioniapp/v407/accesso-cliente',
    body: {
      email: validated.data.email,
      password: validated.data.password,
      id_sede: validated.data.id_sede,
    },
  });

  if (!result.success) {
    return { success: false, error: result.error };
  }

  // Parse and validate response
  const authResponse = authResponseSchema.safeParse(result.data);

  if (!authResponse.success || !authResponse.data.success) {
    return {
      success: false,
      error: authResponse.data?.error || 'Authentication failed',
    };
  }

  const sessionToken = authResponse.data.codice_sessione;

  if (!sessionToken) {
    return {
      success: false,
      error: 'No session token in response',
    };
  }

  // Store credentials and session token in database (D-03)
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

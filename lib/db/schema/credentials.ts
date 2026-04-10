import { pgTable, text, timestamp, uuid, boolean } from 'drizzle-orm/pg-core';
import { users } from './users';

export const credentials = pgTable('credentials', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  pilactiveEmail: text('pilactive_email').notNull(),
  pilactivePassword: text('pilactive_password').notNull(), // TODO: encrypt in Phase 4
  sessionToken: text('session_token'), // codice_sessione from ShaggyOwl
  sessionCookies: text('session_cookies'), // HTTP cookies for session persistence
  tokenExpiresAt: timestamp('token_expires_at', { mode: 'date' }),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

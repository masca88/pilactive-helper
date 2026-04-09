import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { db } from '@/lib/db';

export const adapter = DrizzleAdapter(db);

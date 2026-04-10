import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { config } from 'dotenv';

config({ path: '.env.local' });

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set');
  }

  const sql = postgres(process.env.DATABASE_URL, { max: 1 });
  const db = drizzle(sql);

  console.log('Applying migrations...');
  await migrate(db, { migrationsFolder: './drizzle' });
  console.log('✓ Migrations applied successfully!');

  await sql.end();
}

main().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});

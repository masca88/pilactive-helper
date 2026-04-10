import postgres from 'postgres';
import { config } from 'dotenv';

config({ path: '.env.local' });

const sql = postgres(process.env.DATABASE_URL!);

async function main() {
  try {
    const tables = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `;

    console.log('Existing tables in database:');
    tables.forEach(t => console.log('  -', t.table_name));

    // Check for credentials table specifically
    const credentialsExists = tables.some(t => t.table_name === 'credentials');
    const scheduledBookingsExists = tables.some(t => t.table_name === 'scheduled_bookings');

    console.log('\nTable status:');
    console.log('  credentials:', credentialsExists ? '✓ exists' : '✗ missing');
    console.log('  scheduled_bookings:', scheduledBookingsExists ? '✓ exists' : '✗ missing');
  } catch (err: any) {
    console.error('Error:', err.message);
  } finally {
    await sql.end();
  }
}

main();

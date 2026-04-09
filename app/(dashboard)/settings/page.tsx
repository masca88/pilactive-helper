import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { CredentialsForm } from '@/components/settings/credentials-form';
import { db } from '@/lib/db';
import { credentials } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { Alert } from '@/components/ui/alert';

export default async function SettingsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  // Check if user already has credentials
  const existingCredentials = await db.query.credentials.findFirst({
    where: eq(credentials.userId, session.user.id),
  });

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Impostazioni</h1>

      {existingCredentials && (
        <Alert className="mb-4 bg-blue-50 text-blue-900 border-blue-200">
          Account PilActive collegato: {existingCredentials.pilactiveEmail}
        </Alert>
      )}

      <CredentialsForm />
    </div>
  );
}

'use server';

import { z } from 'zod';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { authenticateWithShaggyOwl } from '@/lib/api/shaggyowl/auth';

const credentialsSchema = z.object({
  email: z.string().email('Indirizzo email non valido'),
  password: z.string().min(1, 'La password è obbligatoria'),
});

export async function saveCredentials(formData: FormData) {
  // Get current user session
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  // Validate form data
  const validated = credentialsSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!validated.success) {
    return {
      success: false,
      error: validated.error.flatten().fieldErrors,
    };
  }

  const { email, password } = validated.data;

  // Authenticate with ShaggyOwl and store credentials
  const result = await authenticateWithShaggyOwl(
    session.user.id,
    email,
    password
  );

  if (!result.success) {
    return {
      success: false,
      error: result.error || 'Autenticazione con PilActive fallita',
    };
  }

  return {
    success: true,
    message: 'Credenziali PilActive collegate con successo!',
  };
}

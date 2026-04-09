'use server';

import { hash } from 'bcryptjs';
import { z } from 'zod';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema/users';
import { signIn } from '@/lib/auth';
import { AuthError } from 'next-auth';

const registerSchema = z.object({
  name: z.string().min(2, 'Il nome deve contenere almeno 2 caratteri'),
  email: z.string().email('Indirizzo email non valido'),
  password: z.string().min(8, 'La password deve contenere almeno 8 caratteri'),
});

type RegisterFormState = {
  success: boolean;
  error?: string | { name?: string[]; email?: string[]; password?: string[] };
};

type LoginFormState = {
  success: boolean;
  error?: string;
};

export async function registerUser(
  _prevState: RegisterFormState | undefined,
  formData: FormData
): Promise<RegisterFormState> {
  const validatedFields = registerSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!validatedFields.success) {
    return {
      success: false,
      error: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { name, email, password } = validatedFields.data;
  const hashedPassword = await hash(password, 10);

  try {
    await db.insert(users).values({
      name,
      email,
      password: hashedPassword,
    });

    // Auto-login after registration
    await signIn('credentials', {
      email,
      password,
      redirect: false,
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: 'Email già esistente o errore del database',
    };
  }
}

export async function loginUser(
  _prevState: LoginFormState | undefined,
  formData: FormData
): Promise<LoginFormState> {
  try {
    await signIn('credentials', {
      email: formData.get('email'),
      password: formData.get('password'),
      redirectTo: '/dashboard',
    });
    return { success: true };
  } catch (error) {
    if (error instanceof AuthError) {
      return { success: false, error: 'Credenziali non valide' };
    }
    throw error;
  }
}

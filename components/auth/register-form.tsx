'use client';

import { useFormState } from 'react-dom';
import { registerUser } from '@/app/actions/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export function RegisterForm() {
  const [state, formAction] = useFormState(registerUser, undefined);
  const router = useRouter();

  useEffect(() => {
    if (state?.success) {
      router.push('/dashboard');
    }
  }, [state?.success, router]);

  return (
    <form action={formAction} className="space-y-4">
      {state?.error && typeof state.error === 'string' && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="name">Nome</Label>
        <Input id="name" name="name" type="text" required />
        {state?.error && typeof state.error !== 'string' && state.error.name && (
          <p className="text-sm text-destructive">{state.error.name[0]}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required />
        {state?.error && typeof state.error !== 'string' && state.error.email && (
          <p className="text-sm text-destructive">{state.error.email[0]}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" required />
        {state?.error && typeof state.error !== 'string' && state.error.password && (
          <p className="text-sm text-destructive">{state.error.password[0]}</p>
        )}
      </div>

      <Button type="submit" className="w-full">
        Registrati
      </Button>
    </form>
  );
}

'use client';

import { useFormState } from 'react-dom';
import { saveCredentials } from '@/app/actions/credentials';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert } from '@/components/ui/alert';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';

export function CredentialsForm() {
  const [state, formAction] = useFormState(saveCredentials, undefined);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Credenziali PilActive</CardTitle>
        <CardDescription>
          Collega il tuo account PilActive per abilitare le prenotazioni
          automatiche
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          {state?.error && typeof state.error === 'string' && (
            <Alert variant="destructive">{state.error}</Alert>
          )}

          {state?.success && state.message && (
            <Alert className="bg-green-50 text-green-900 border-green-200">
              {state.message}
            </Alert>
          )}

          <div>
            <Label htmlFor="email">Email PilActive</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="tua.email@esempio.com"
              required
            />
            <p className="text-sm text-muted-foreground mt-1">
              L'email che usi per prenotare le lezioni su PilActive
            </p>
          </div>

          <div>
            <Label htmlFor="password">Password PilActive</Label>
            <Input id="password" name="password" type="password" required />
            <p className="text-sm text-muted-foreground mt-1">
              La tua password sarà salvata in modo sicuro per abilitare le
              prenotazioni automatiche
            </p>
          </div>

          <Button type="submit" className="w-full">
            Collega Account PilActive
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

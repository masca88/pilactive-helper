'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Events page error:', error);
  }, [error]);

  return (
    <div className="container mx-auto py-8">
      <Alert variant="destructive">
        <AlertTitle>Errore nel caricamento degli eventi</AlertTitle>
        <AlertDescription>
          {error.message || 'Si è verificato un errore imprevisto.'}
        </AlertDescription>
      </Alert>

      <Button onClick={reset} className="mt-4">
        Riprova
      </Button>
    </div>
  );
}

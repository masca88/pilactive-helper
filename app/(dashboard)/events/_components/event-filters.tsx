'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

interface EventFiltersProps {
  initialFilters: {
    dateFrom?: string;
    dateTo?: string;
    eventType?: string;
  };
}

export function EventFilters({ initialFilters }: EventFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function updateFilters(newFilters: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams);

    Object.entries(newFilters).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });

    startTransition(() => {
      router.push(`/events?${params.toString()}`);
    });
  }

  function clearFilters() {
    startTransition(() => {
      router.push('/events');
    });
  }

  return (
    <div className="bg-card border rounded-lg p-6 mb-6">
      <h2 className="text-lg font-semibold mb-4">Filtri</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="dateFrom">Data inizio</Label>
          <Input
            id="dateFrom"
            type="date"
            defaultValue={initialFilters.dateFrom}
            onChange={(e) => updateFilters({ dateFrom: e.target.value })}
            disabled={isPending}
          />
        </div>

        <div>
          <Label htmlFor="dateTo">Data fine</Label>
          <Input
            id="dateTo"
            type="date"
            defaultValue={initialFilters.dateTo}
            onChange={(e) => updateFilters({ dateTo: e.target.value })}
            disabled={isPending}
          />
        </div>

        <div>
          <Label htmlFor="eventType">Tipo corso</Label>
          <Input
            id="eventType"
            type="text"
            placeholder="es. Reformer Base"
            defaultValue={initialFilters.eventType}
            onChange={(e) => updateFilters({ eventType: e.target.value })}
            disabled={isPending}
          />
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <Button
          variant="outline"
          onClick={clearFilters}
          disabled={isPending}
        >
          Rimuovi filtri
        </Button>
      </div>

      {isPending && (
        <p className="text-sm text-muted-foreground mt-2">
          Aggiornamento in corso...
        </p>
      )}
    </div>
  );
}

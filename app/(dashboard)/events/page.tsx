import { Suspense } from 'react';
import { getEvents } from '@/lib/api/shaggyowl/events';
import { EventList } from './_components/event-list';
import { EventFilters } from './_components/event-filters';
import { Skeleton } from '@/components/ui/skeleton';

interface PageProps {
  searchParams: Promise<{
    dateFrom?: string;
    dateTo?: string;
    eventType?: string;
  }>;
}

function EventListSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-64 w-full" />
      ))}
    </div>
  );
}

export default async function EventsPage({ searchParams }: PageProps) {
  // Next.js 16: searchParams è Promise
  const params = await searchParams;

  // Fetch eventi server-side con filtri da URL
  const events = await getEvents({
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
    eventType: params.eventType,
  });

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Eventi Disponibili</h1>
        <p className="text-muted-foreground">
          Sfoglia e filtra i corsi disponibili presso PilActive Sesto San Giovanni
        </p>
      </div>

      <Suspense fallback={<div className="mb-6">Caricamento filtri...</div>}>
        <EventFilters initialFilters={params} />
      </Suspense>

      <div className="mt-6">
        {events.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              Nessun evento trovato con i filtri selezionati.
            </p>
          </div>
        ) : (
          <Suspense fallback={<EventListSkeleton />}>
            <EventList events={events} />
          </Suspense>
        )}
      </div>
    </div>
  );
}

import { Badge } from '@/components/ui/badge';
import type { Event } from '@/lib/api/shaggyowl/events';

type EventStatus = 'available' | 'waitlist' | 'booked' | 'full' | 'not-open';

interface EventStatusBadgeProps {
  status: EventStatus;
  message: string;
}

export function EventStatusBadge({ status, message }: EventStatusBadgeProps) {
  const config = {
    'available': {
      variant: 'default' as const,
      label: 'Disponibile',
      className: 'bg-green-600 hover:bg-green-700'
    },
    'waitlist': {
      variant: 'secondary' as const,
      label: "Lista d'attesa",
      className: ''
    },
    'booked': {
      variant: 'default' as const,
      label: 'Già prenotato',
      className: 'bg-blue-600 hover:bg-blue-700'
    },
    'full': {
      variant: 'destructive' as const,
      label: 'Esaurito',
      className: ''
    },
    'not-open': {
      variant: 'outline' as const,
      label: 'Non ancora aperto',
      className: ''
    },
  };

  const { variant, label, className } = config[status];

  return (
    <div className="flex flex-col gap-1">
      <Badge variant={variant} className={className}>
        {label}
      </Badge>
      {message && (
        <span className="text-xs text-muted-foreground">{message}</span>
      )}
    </div>
  );
}

/**
 * Determina lo stato di disponibilità dell'evento
 */
export function getEventStatus(event: Event): EventStatus {
  if (event.giaPrenotato) return 'booked';
  if (!event.prenotabile) return 'not-open';
  if (event.postiDisponibili > 0) return 'available';
  if (event.utentiInCoda > 0) return 'waitlist';
  return 'full';
}

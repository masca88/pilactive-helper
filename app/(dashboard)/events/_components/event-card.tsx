import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, MapPin, Users } from 'lucide-react';
import { formatEventDate, formatEventTimeRange, formatRelativeDate } from '@/lib/utils/date-format';
import { EventStatusBadge, getEventStatus } from './event-status-badge';
import type { Event } from '@/lib/api/shaggyowl/events';

interface EventCardProps {
  event: Event;
}

export function EventCard({ event }: EventCardProps) {
  const status = getEventStatus(event);

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <CardTitle className="text-xl mb-1">{event.nome}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {formatEventDate(event.data)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {formatRelativeDate(event.data)}
            </p>
          </div>
          <div
            className="w-6 h-6 rounded-full flex-shrink-0"
            style={{ backgroundColor: event.colore }}
            aria-label={`Colore corso: ${event.colore}`}
          />
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <span>{formatEventTimeRange(event.oraInizio, event.oraFine)}</span>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <span>{event.stanza}</span>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <Users className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <span>
              {event.postiDisponibili} disponibili / {event.postiOccupati} occupati
            </span>
          </div>

          <div className="pt-2 border-t">
            <EventStatusBadge status={status} message={event.messaggioStato} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

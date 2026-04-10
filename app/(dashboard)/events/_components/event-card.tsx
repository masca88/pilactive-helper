"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, MapPin, Users, Calendar } from 'lucide-react';
import { formatEventDate, formatEventTimeRange, formatRelativeDate } from '@/lib/utils/date-format';
import { EventStatusBadge, getEventStatus } from './event-status-badge';
import { scheduleBooking } from '@/app/actions/scheduled-bookings';
import type { Event } from '@/lib/api/shaggyowl/events';
import { useState } from 'react';

interface EventCardProps {
  event: Event;
}

export function EventCard({ event }: EventCardProps) {
  const status = getEventStatus(event);
  const [isScheduling, setIsScheduling] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);

  // Determine if event is in the past
  const isPastEvent = new Date(`${event.data}T${event.oraInizio}:00`) < new Date();

  async function handleScheduleBooking() {
    setIsScheduling(true);
    setScheduleError(null);

    const formData = new FormData();
    formData.append("eventId", event.id);
    formData.append("eventName", event.nome);
    // ISO 8601 format for Zod validation (Europe/Rome is UTC+1 in winter, UTC+2 in summer)
    // Using +01:00 as default, Temporal API will handle DST correctly
    formData.append("eventStartTime", `${event.data}T${event.oraInizio}:00+01:00`);
    formData.append("eventDate", event.data); // YYYY-MM-DD format
    if (event.immagine) {
      formData.append("eventInstructor", event.immagine); // Instructor name in immagine field
    }

    const result = await scheduleBooking(formData);

    if (result.success) {
      // Show success feedback
      alert(`Prenotazione programmata per ${new Date(result.executeAt!).toLocaleString('it-IT', { timeZone: 'Europe/Rome' })}`);
    } else {
      setScheduleError(result.error);
    }

    setIsScheduling(false);
  }

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

          <div className="pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleScheduleBooking}
              disabled={isScheduling || event.giaPrenotato || isPastEvent}
              className="flex items-center gap-2 w-full"
            >
              <Calendar className="h-4 w-4" />
              {isScheduling ? "Programmazione..." : "Prenota automaticamente"}
            </Button>

            {scheduleError && (
              <p className="text-sm text-red-500 mt-2">{scheduleError}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

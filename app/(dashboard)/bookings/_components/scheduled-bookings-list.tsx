"use client";

import { useState } from 'react';
import { cancelScheduledBooking } from '@/app/actions/scheduled-bookings';
import { formatEventDate } from '@/lib/utils/date-format';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, X } from 'lucide-react';
import type { scheduledBookings } from '@/lib/db/schema';
import type { InferSelectModel } from 'drizzle-orm';

type ScheduledBooking = InferSelectModel<typeof scheduledBookings>;

export function ScheduledBookingsList({
  bookings,
}: {
  bookings: ScheduledBooking[];
}) {
  const [cancelling, setCancelling] = useState<string | null>(null);

  async function handleCancel(bookingId: string) {
    if (
      !confirm(
        'Sei sicuro di voler cancellare questa prenotazione automatica?'
      )
    ) {
      return;
    }

    setCancelling(bookingId);
    const result = await cancelScheduledBooking(bookingId);

    if (result.success) {
      window.location.reload(); // Refresh to show updated list
    } else {
      alert(result.error);
    }

    setCancelling(null);
  }

  if (bookings.length === 0) {
    return (
      <div className="text-center py-12">
        <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-lg text-muted-foreground">
          Nessuna prenotazione programmata
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          Vai alla pagina Eventi per programmare prenotazioni automatiche
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {bookings.map((booking) => (
        <div
          key={booking.id}
          className="border rounded-lg p-4 bg-card hover:shadow-md transition-shadow"
        >
          <div className="flex items-start justify-between">
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-lg">{booking.eventName}</h3>
                <StatusBadge status={booking.status} />
              </div>

              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {formatEventDate(booking.eventStartTime.toISOString())}
                  </span>
                </div>
                {booking.eventInstructor && (
                  <span>• {booking.eventInstructor}</span>
                )}
              </div>

              <div className="flex items-center gap-1 text-sm">
                <Clock className="h-4 w-4" />
                <span>
                  Esecuzione programmata:{' '}
                  <strong>
                    {new Date(booking.executeAt).toLocaleString('it-IT', {
                      timeZone: 'Europe/Rome',
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </strong>
                </span>
                <span className="text-muted-foreground">
                  ({getTimeUntil(booking.executeAt)})
                </span>
              </div>

              {booking.errorMessage && (
                <p className="text-sm text-red-500 mt-2">
                  Errore: {booking.errorMessage}
                </p>
              )}
            </div>

            {booking.status === 'pending' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCancel(booking.id)}
                disabled={cancelling === booking.id}
                className="ml-4"
              >
                <X className="h-4 w-4" />
                Cancella
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config = {
    pending: { label: 'In attesa', variant: 'secondary' as const },
    executing: { label: 'In esecuzione', variant: 'default' as const },
    success: { label: 'Completata', variant: 'default' as const },
    failed: { label: 'Fallita', variant: 'destructive' as const },
    cancelled: { label: 'Cancellata', variant: 'outline' as const },
  };

  const {
    label,
    variant,
  } = config[status as keyof typeof config] ?? config.pending;

  return <Badge variant={variant}>{label}</Badge>;
}

function getTimeUntil(executeAt: Date): string {
  const now = Date.now();
  const diff = executeAt.getTime() - now;

  if (diff < 0) {
    return 'scaduta';
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor(
    (diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
  );

  if (days > 0) {
    return `tra ${days} giorni`;
  } else if (hours > 0) {
    return `tra ${hours} ore`;
  } else {
    return `tra meno di 1 ora`;
  }
}

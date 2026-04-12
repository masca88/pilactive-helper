import { getScheduledBookings } from '@/app/actions/scheduled-bookings';
import { ScheduledBookingsList } from './_components/scheduled-bookings-list';

export default async function BookingsPage() {
  const bookings = await getScheduledBookings();

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Prenotazioni Programmate</h1>
        <p className="text-muted-foreground mt-2">
          Visualizza e gestisci le tue prenotazioni automatiche
        </p>
      </div>

      <ScheduledBookingsList bookings={bookings} />
    </div>
  );
}

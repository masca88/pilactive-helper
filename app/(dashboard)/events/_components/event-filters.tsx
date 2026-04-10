'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useTransition, useState } from 'react';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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

  // Initialize single date from URL params (only use dateFrom)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(() => {
    if (initialFilters.dateFrom) {
      return new Date(initialFilters.dateFrom);
    }
    return undefined;
  });

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

  function handleDateChange(date: Date | undefined) {
    setSelectedDate(date);
    updateFilters({
      dateFrom: date ? format(date, 'yyyy-MM-dd') : undefined,
      dateTo: undefined, // Remove dateTo as we only use single date
    });
  }

  function clearFilters() {
    setSelectedDate(undefined);
    startTransition(() => {
      router.push('/events');
    });
  }

  return (
    <div className="bg-card border rounded-lg p-6 mb-6">
      <h2 className="text-lg font-semibold mb-4 text-foreground">Filtri</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Date Range Picker */}
        <div className="space-y-2">
          <Label htmlFor="date-range" className="text-sm font-medium text-foreground">
            Periodo
          </Label>
          <Popover>
            <PopoverTrigger>
              <Button
                id="date-range"
                variant="outline"
                className={cn(
                  'w-full justify-start text-left font-normal text-foreground',
                  !selectedDate && 'text-muted-foreground'
                )}
                disabled={isPending}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDate ? (
                  format(selectedDate, 'dd MMM yyyy', { locale: it })
                ) : (
                  <span>Seleziona data</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                initialFocus
                mode="single"
                selected={selectedDate}
                onSelect={handleDateChange}
                locale={it}
                disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Event Type Filter */}
        <div className="space-y-2">
          <Label htmlFor="eventType" className="text-sm font-medium text-foreground">
            Tipo corso
          </Label>
          <Input
            id="eventType"
            type="text"
            placeholder="es. Reformer Base"
            defaultValue={initialFilters.eventType}
            onChange={(e) => updateFilters({ eventType: e.target.value })}
            disabled={isPending}
            className="text-foreground placeholder:text-muted-foreground"
          />
        </div>
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <Button
          variant="outline"
          onClick={clearFilters}
          disabled={isPending}
          className="text-foreground"
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

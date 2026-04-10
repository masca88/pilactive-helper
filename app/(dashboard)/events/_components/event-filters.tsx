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

  // Initialize date range from URL params
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    if (initialFilters.dateFrom || initialFilters.dateTo) {
      return {
        from: initialFilters.dateFrom ? new Date(initialFilters.dateFrom) : undefined,
        to: initialFilters.dateTo ? new Date(initialFilters.dateTo) : undefined,
      };
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

  function handleDateRangeChange(range: DateRange | undefined) {
    setDateRange(range);
    updateFilters({
      dateFrom: range?.from ? format(range.from, 'yyyy-MM-dd') : undefined,
      dateTo: range?.to ? format(range.to, 'yyyy-MM-dd') : undefined,
    });
  }

  function clearFilters() {
    setDateRange(undefined);
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
            <PopoverTrigger asChild>
              <Button
                id="date-range"
                variant="outline"
                className={cn(
                  'w-full justify-start text-left font-normal text-foreground',
                  !dateRange && 'text-muted-foreground'
                )}
                disabled={isPending}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, 'dd MMM yyyy', { locale: it })} -{' '}
                      {format(dateRange.to, 'dd MMM yyyy', { locale: it })}
                    </>
                  ) : (
                    format(dateRange.from, 'dd MMM yyyy', { locale: it })
                  )
                ) : (
                  <span>Seleziona un periodo</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange?.from}
                selected={dateRange}
                onSelect={handleDateRangeChange}
                numberOfMonths={2}
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

import { addDays } from '@shared/metrics';
import type { Period } from '@shared/types';

/** The `days` days that end on `to`, both ends included. */
export const lastDays = (to: string, days: number): Period => ({
  from: addDays(to, 1 - days),
  to,
});

/** The calendar month `offset` months away from the month of `date`. */
function calendarMonth(date: string, offset: number): Period {
  const year = Number(date.slice(0, 4));
  const month = Number(date.slice(5, 7)) - 1 + offset;
  return {
    from: new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10),
    to: new Date(Date.UTC(year, month + 1, 0)).toISOString().slice(0, 10),
  };
}

/** From the first of the month up to `today`. */
export const monthToDate = (today: string): Period => ({
  from: calendarMonth(today, 0).from,
  to: today,
});

/** The last month that is complete on `today`: this month on its last day, else the one before. */
export function lastFullMonth(today: string): Period {
  const current = calendarMonth(today, 0);
  return current.to === today ? current : calendarMonth(today, -1);
}

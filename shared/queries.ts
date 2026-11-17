import data from '../data/data.json';
import { adr, occupancy, revpar } from './metrics';
import type { Dataset, DateRange, DayRecord, Hotel, Kpis } from './types';

const dataset: Dataset = data;

export function getHotel(): Hotel {
  return dataset.hotel;
}

/** Days within the inclusive range, in date order. ISO dates compare correctly as strings. */
export function getDays({ from, to }: DateRange = {}): DayRecord[] {
  return dataset.days.filter(
    (day) => (from === undefined || day.date >= from) && (to === undefined || day.date <= to),
  );
}

export function getKpis(range: DateRange = {}): Kpis {
  let roomsAvailable = 0;
  let roomsSold = 0;
  let roomRevenue = 0;
  for (const day of getDays(range)) {
    roomsAvailable += day.roomsAvailable;
    roomsSold += day.roomsSold;
    roomRevenue += day.roomRevenue;
  }
  return {
    occupancy: occupancy(roomsSold, roomsAvailable),
    adr: adr(roomRevenue, roomsSold),
    revpar: revpar(roomRevenue, roomsAvailable),
  };
}

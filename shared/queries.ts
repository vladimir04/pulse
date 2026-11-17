import data from '../data/data.json';
import { adr, occupancy, revpar } from './metrics';
import type { Dataset, Hotel, HotelDateRange, Kpis, RoomsDay } from './types';

const dataset = data as Dataset;

/** The dataset's "today": the last day of actuals. */
export function getAsOf(): string {
  return dataset.asOf;
}

export function getHotels(): Hotel[] {
  return dataset.hotels;
}

export function getHotel(hotelId: string): Hotel | undefined {
  return dataset.hotels.find((hotel) => hotel.id === hotelId);
}

/** One hotel's days within the inclusive range, in date order. ISO dates compare as strings. */
export function getRoomsDays({ hotelId, from, to }: HotelDateRange): RoomsDay[] {
  return dataset.roomsDays.filter(
    (day) =>
      day.hotelId === hotelId &&
      (from === undefined || day.date >= from) &&
      (to === undefined || day.date <= to),
  );
}

export function getKpis(range: HotelDateRange): Kpis {
  let roomsAvailable = 0;
  let roomsSold = 0;
  let roomRevenue = 0;
  for (const day of getRoomsDays(range)) {
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

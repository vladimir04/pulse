/*
 * The dataset model. Dates are ISO 'YYYY-MM-DD'; money is rounded to 2 decimals in the hotel's
 * currency; counts are integers. `data/data.json` is written by `scripts/generate.ts`.
 */

export interface Hotel {
  id: string;
  name: string;
  city: string;
  type: 'city' | 'resort';
  rooms: number;
  currency: 'EUR';
  otherOperatingCostsPerDay: number;
  restaurantName: string;
  restaurantSeats: number;
}

export interface BookingChannel {
  id: string;
  name: string;
  kind: 'direct' | 'ota' | 'corporate' | 'wholesale';
  /** Share of room revenue paid to the channel, 0–100 */
  commissionPercent: number;
  /** Flat cost per booking */
  costPerBooking: number;
}

export interface RoomsDay {
  hotelId: string;
  date: string;
  /** hotel.rooms minus rooms out of service */
  roomsAvailable: number;
  roomsSold: number;
  roomRevenue: number;
  publishedRate: number;
  guestsInHouse: number;
}

export interface RoomsByChannelDay {
  hotelId: string;
  date: string;
  channelId: string;
  roomsSold: number;
  roomRevenue: number;
  bookings: number;
}

export interface RestaurantDay {
  hotelId: string;
  date: string;
  covers: number;
  revenue: number;
  ingredientCost: number;
}

export interface StaffingDay {
  hotelId: string;
  date: string;
  department: 'rooms' | 'restaurant' | 'front_desk';
  cost: number;
}

/** Rooms on the books for a stay date, as they stood on a snapshot date. */
export interface FutureBookingSnapshot {
  hotelId: string;
  stayDate: string;
  snapshotDate: string;
  roomsBooked: number;
  revenueBooked: number;
}

export interface Event {
  hotelId: string;
  date: string;
  kind:
    | 'rate_change'
    | 'promotion'
    | 'city_event'
    | 'staffing'
    | 'maintenance'
    | 'restaurant'
    | 'market';
  title: string;
  detail: string;
}

export interface Dataset {
  /** The "today" of the dataset: last day of actuals, snapshot date of the current bookings */
  asOf: string;
  hotels: Hotel[];
  bookingChannels: BookingChannel[];
  roomsDays: RoomsDay[];
  roomsByChannelDays: RoomsByChannelDay[];
  restaurantDays: RestaurantDay[];
  staffingDays: StaffingDay[];
  futureBookingSnapshots: FutureBookingSnapshot[];
  events: Event[];
}

/** Inclusive date range, YYYY-MM-DD. An omitted bound is open. */
export interface DateRange {
  from?: string;
  to?: string;
}

export interface HotelDateRange extends DateRange {
  hotelId: string;
}

export interface Kpis {
  /** Rooms sold / rooms available, as a fraction (0–1) */
  occupancy: number;
  /** Average daily rate: room revenue / rooms sold */
  adr: number;
  /** Revenue per available room: room revenue / rooms available */
  revpar: number;
}

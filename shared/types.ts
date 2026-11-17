/*
 * The dataset model. Dates are ISO 'YYYY-MM-DD'; money is rounded to 2 decimals in the hotel's
 * currency; counts are integers. `data/data.json` is written by `scripts/generate.ts`.
 */

import type { MetricKey } from './metrics';

export type HotelId = 'hotel-central' | 'marina-resort';

export interface Hotel {
  id: HotelId;
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
  /** A few words for a chart, where the title is too long */
  label: string;
  detail: string;
  /** The last day of an event that ran for a while */
  endDate?: string;
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

// ---------------------------------------------------------------------------------------------
// Query results. Numbers are ready to show: percent values are on a 0–100 scale with one
// decimal, money has two decimals, counts are whole numbers.
// ---------------------------------------------------------------------------------------------

/** A span of days, both ends included. */
export interface Period {
  from: string;
  to: string;
}

export type MetricUnit = 'percent' | 'currency' | 'count' | 'ratio';

/** Percent metrics change in points; everything else changes in percent. */
export type DeltaUnit = 'points' | 'percent';

export interface Comparison {
  value: number;
  /** Current value against this one, in `deltaUnit` */
  delta: number;
  deltaUnit: DeltaUnit;
}

export interface MetricValue {
  value: number;
  unit: MetricUnit;
  /** The same weekdays 364 days earlier; null when the data does not go back that far. */
  lastYear: Comparison | null;
}

export interface Kpis {
  hotelId: string;
  period: Period;
  lastYearPeriod: Period;
  roomsAvailable: MetricValue;
  roomsSold: MetricValue;
  occupancy: MetricValue;
  averageDailyRate: MetricValue;
  revenuePerAvailableRoom: MetricValue;
  netRevenuePerAvailableRoom: MetricValue;
  operatingProfit: MetricValue;
}

export type Grain = 'day' | 'week' | 'month';

export interface Timeseries {
  metric: MetricKey;
  unit: MetricUnit;
  grain: Grain;
  /** Bucket labels: the date, the Monday that starts the week, or YYYY-MM */
  x: string[];
  current: number[];
  /** The same days 364 days earlier, per bucket; null where the data does not go back that far. */
  lastYear: (number | null)[];
  /** Set on a smoothed series: each point covers this many days, ending on its date. */
  rollingDays?: number;
}

export interface ChannelPerformance {
  channelId: string;
  name: string;
  kind: BookingChannel['kind'];
  roomsSold: number;
  bookings: number;
  shareOfRooms: number;
  grossRevenue: number;
  distributionCost: number;
  netRevenue: number;
  /** Gross revenue per room night */
  grossRate: number;
  /** Net revenue per room night */
  netRate: number;
  grossRevenueRank: number;
  netRateRank: number;
}

export interface BookingPace {
  hotelId: string;
  stayFrom: string;
  stayTo: string;
  asOf: string;
  roomsBookedNow: number;
  roomsBookedSameTimeLastYear: number;
  paceRatio: number;
  pickup7: number;
  pickup14: number;
  pickup28: number;
  lastYearPickup14: number;
  /** Rooms still unsold across the stay dates */
  roomsRemaining: number;
  byWeek: {
    weekStart: string;
    roomsBookedNow: number;
    roomsBookedSameTimeLastYear: number;
    paceRatio: number;
  }[];
}

export interface RestaurantPerformance {
  hotelId: string;
  restaurantName: string;
  period: Period;
  lastYearPeriod: Period;
  covers: MetricValue;
  revenue: MetricValue;
  ingredientCost: MetricValue;
  staffingCost: MetricValue;
  captureRate: MetricValue;
  revenuePerCover: MetricValue;
  margin: MetricValue;
  split: Record<
    'monToThu' | 'friToSun',
    {
      covers: MetricValue;
      captureRate: MetricValue;
      revenuePerCover: MetricValue;
      margin: MetricValue;
    }
  >;
}

export interface StaffingPerformance {
  hotelId: string;
  period: Period;
  lastYearPeriod: Period;
  byDepartment: Record<
    StaffingDay['department'],
    { cost: MetricValue; costPerOccupiedRoom: MetricValue }
  >;
  staffingCost: MetricValue;
  staffingCostPerOccupiedRoom: MetricValue;
  staffingCostPercent: MetricValue;
}

// ---------------------------------------------------------------------------------------------
// Insights
// ---------------------------------------------------------------------------------------------

export interface ChartSpec {
  type: 'line' | 'bar';
  title: string;
  unit: MetricUnit;
  x: string[];
  series: {
    name: string;
    data: (number | null)[];
    /** `entity` series stand for one thing each (a channel), named by `entityId` */
    role: 'current' | 'lastYear' | 'entity';
    entityId?: string;
  }[];
  markers?: { x: string; label: string }[];
}

export interface Insight {
  id: string;
  hotelId: string;
  severity: 'critical' | 'warning' | 'positive' | 'info';
  category: 'profit' | 'bookings' | 'restaurant' | 'channels' | 'staffing';
  /** One sentence with the number, in plain English */
  headline: string;
  /** Glossary key of the metric the insight is about */
  metric: MetricKey;
  period: Period & { label: string };
  delta: { value: number; unit: DeltaUnit };
  chart: ChartSpec;
  cause: string;
  causeEvents: Event[];
  /** One imperative sentence */
  nextMove: string;
  /** The queries the insight ran, by tool name, with their arguments and results */
  evidence: { query: string; args: unknown; rows: unknown }[];
  /** 1 is the most important insight for the hotel */
  rank: number;
}

/** One answer in the Ask drawer: what the model presents, plus the tool calls behind it. */
export interface AnswerCard {
  /** One sentence that answers the question, with the number */
  headline: string;
  chart?: ChartSpec;
  cause: string;
  /** One imperative sentence */
  nextMove: string;
  /** How directly the tool results support the answer */
  confidence: 'high' | 'medium' | 'low';
  /** Short questions that take the answer further */
  followUps: string[];
  /** The tool calls behind the answer, in the order they ran */
  evidence: { name: string; input: Record<string, unknown> }[];
}

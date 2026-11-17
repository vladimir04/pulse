import type { DeltaUnit, MetricUnit, Period } from './types';

/**
 * Base measures of one hotel summed over a period. Every period metric below is derived from
 * these, so a metric over any period is the metric of the summed measures, never an average
 * of daily values.
 */
export interface Totals {
  days: number;
  roomsAvailable: number;
  roomsSold: number;
  /** Rooms sold on the hotel's own (direct) channel */
  directRoomsSold: number;
  roomRevenue: number;
  guestsInHouse: number;
  distributionCost: number;
  covers: number;
  restaurantRevenue: number;
  ingredientCost: number;
  roomsStaffingCost: number;
  restaurantStaffingCost: number;
  frontDeskStaffingCost: number;
  /** otherOperatingCostsPerDay × days */
  otherOperatingCosts: number;
}

export const emptyTotals = (): Totals => ({
  days: 0,
  roomsAvailable: 0,
  roomsSold: 0,
  directRoomsSold: 0,
  roomRevenue: 0,
  guestsInHouse: 0,
  distributionCost: 0,
  covers: 0,
  restaurantRevenue: 0,
  ingredientCost: 0,
  roomsStaffingCost: 0,
  restaurantStaffingCost: 0,
  frontDeskStaffingCost: 0,
  otherOperatingCosts: 0,
});

/** Adds one set of measures into another and returns it. */
export function addTotals(into: Totals, more: Totals): Totals {
  for (const key of Object.keys(into) as (keyof Totals)[]) into[key] += more[key];
  return into;
}

/** Division that reads an empty period as 0 instead of NaN. */
export const divide = (numerator: number, denominator: number): number =>
  denominator === 0 ? 0 : numerator / denominator;

// ---------------------------------------------------------------------------------------------
// Rooms
// ---------------------------------------------------------------------------------------------

/** occupancy = roomsSold / roomsAvailable */
export const occupancy = (totals: Totals): number =>
  divide(totals.roomsSold, totals.roomsAvailable);

/** averageDailyRate = roomRevenue / roomsSold */
export const averageDailyRate = (totals: Totals): number =>
  divide(totals.roomRevenue, totals.roomsSold);

/** revenuePerAvailableRoom = roomRevenue / roomsAvailable */
export const revenuePerAvailableRoom = (totals: Totals): number =>
  divide(totals.roomRevenue, totals.roomsAvailable);

/** distributionCost = Σ per channel (roomRevenue × commissionPercent / 100 + bookings × costPerBooking) */
export const distributionCost = (
  channels: {
    roomRevenue: number;
    bookings: number;
    commissionPercent: number;
    costPerBooking: number;
  }[],
): number =>
  channels.reduce(
    (cost, channel) =>
      cost +
      (channel.roomRevenue * channel.commissionPercent) / 100 +
      channel.bookings * channel.costPerBooking,
    0,
  );

/** netRoomRevenue = roomRevenue − distributionCost */
export const netRoomRevenue = (totals: Totals): number =>
  totals.roomRevenue - totals.distributionCost;

/** netRevenuePerAvailableRoom = netRoomRevenue / roomsAvailable */
export const netRevenuePerAvailableRoom = (totals: Totals): number =>
  divide(netRoomRevenue(totals), totals.roomsAvailable);

/** netRate = netRoomRevenue / roomsSold */
export const netRate = (totals: Totals): number => divide(netRoomRevenue(totals), totals.roomsSold);

/** directShare = directRoomsSold / roomsSold */
export const directShare = (totals: Totals): number =>
  divide(totals.directRoomsSold, totals.roomsSold);

// ---------------------------------------------------------------------------------------------
// Hotel as a whole
// ---------------------------------------------------------------------------------------------

/** totalRevenue = roomRevenue + restaurantRevenue */
export const totalRevenue = (totals: Totals): number =>
  totals.roomRevenue + totals.restaurantRevenue;

/** totalRevenuePerAvailableRoom = totalRevenue / roomsAvailable */
export const totalRevenuePerAvailableRoom = (totals: Totals): number =>
  divide(totalRevenue(totals), totals.roomsAvailable);

/** staffingCost = rooms + restaurant + front desk staffing cost */
export const staffingCost = (totals: Totals): number =>
  totals.roomsStaffingCost + totals.restaurantStaffingCost + totals.frontDeskStaffingCost;

/** staffingCostPerOccupiedRoom = staffingCost / roomsSold */
export const staffingCostPerOccupiedRoom = (totals: Totals): number =>
  divide(staffingCost(totals), totals.roomsSold);

/** staffingCostPercent = staffingCost / totalRevenue */
export const staffingCostPercent = (totals: Totals): number =>
  divide(staffingCost(totals), totalRevenue(totals));

/** operatingProfit = totalRevenue − distributionCost − ingredientCost − staffingCost − otherOperatingCostsPerDay × days */
export const operatingProfit = (totals: Totals): number =>
  totalRevenue(totals) -
  totals.distributionCost -
  totals.ingredientCost -
  staffingCost(totals) -
  totals.otherOperatingCosts;

/** profitPerAvailableRoom = operatingProfit / roomsAvailable */
export const profitPerAvailableRoom = (totals: Totals): number =>
  divide(operatingProfit(totals), totals.roomsAvailable);

/** profitMargin = operatingProfit / totalRevenue */
export const profitMargin = (totals: Totals): number =>
  divide(operatingProfit(totals), totalRevenue(totals));

// ---------------------------------------------------------------------------------------------
// Restaurant
// ---------------------------------------------------------------------------------------------

/** restaurantCaptureRate = covers / guestsInHouse */
export const restaurantCaptureRate = (totals: Totals): number =>
  divide(totals.covers, totals.guestsInHouse);

/** revenuePerCover = restaurantRevenue / covers */
export const revenuePerCover = (totals: Totals): number =>
  divide(totals.restaurantRevenue, totals.covers);

/** restaurantMargin = (restaurantRevenue − ingredientCost − restaurant staffing cost) / restaurantRevenue */
export const restaurantMargin = (totals: Totals): number =>
  divide(
    totals.restaurantRevenue - totals.ingredientCost - totals.restaurantStaffingCost,
    totals.restaurantRevenue,
  );

// ---------------------------------------------------------------------------------------------
// Future bookings
// ---------------------------------------------------------------------------------------------

/** bookingPace = roomsBooked(asOf) / roomsBooked(asOf − 364 days, for stay dates − 364 days) */
export const bookingPace = (roomsBookedNow: number, roomsBookedSameTimeLastYear: number): number =>
  divide(roomsBookedNow, roomsBookedSameTimeLastYear);

/** bookingPickup(n) = roomsBooked(asOf) − roomsBooked(asOf − n days) */
export const bookingPickup = (roomsBookedNow: number, roomsBookedEarlier: number): number =>
  roomsBookedNow - roomsBookedEarlier;

// ---------------------------------------------------------------------------------------------
// Registry and comparisons
// ---------------------------------------------------------------------------------------------

/** Every metric that can be computed from a period's totals, by glossary key. */
export const periodMetrics = {
  occupancy,
  averageDailyRate,
  revenuePerAvailableRoom,
  distributionCost: (totals: Totals) => totals.distributionCost,
  netRoomRevenue,
  netRevenuePerAvailableRoom,
  netRate,
  directShare,
  totalRevenue,
  totalRevenuePerAvailableRoom,
  restaurantCaptureRate,
  revenuePerCover,
  restaurantMargin,
  staffingCost,
  staffingCostPerOccupiedRoom,
  staffingCostPercent,
  operatingProfit,
  profitPerAvailableRoom,
  profitMargin,
} satisfies Record<string, (totals: Totals) => number>;

export type PeriodMetricKey = keyof typeof periodMetrics;
export type MetricKey = PeriodMetricKey | 'bookingPace' | 'bookingPickup';

/** Days back to the same weekday a year earlier. */
export const YEAR_DAYS = 364;

const DAY_MS = 86_400_000;

export const addDays = (date: string, days: number): string =>
  new Date(Date.parse(date) + days * DAY_MS).toISOString().slice(0, 10);

/** The same weekdays a year earlier: both dates shifted back 364 days. */
export const sameTimeLastYear = ({ from, to }: Period): Period => ({
  from: addDays(from, -YEAR_DAYS),
  to: addDays(to, -YEAR_DAYS),
});

/** Percent metrics (occupancy, capture rate, shares, margins) change in points; the rest in percent. */
export const deltaUnit = (unit: MetricUnit): DeltaUnit =>
  unit === 'percent' ? 'points' : 'percent';

/** Change against last year, in the metric's delta unit. A percent metric is passed as a fraction. */
export const delta = (unit: MetricUnit, current: number, lastYear: number): number =>
  unit === 'percent'
    ? (current - lastYear) * 100
    : divide(current - lastYear, Math.abs(lastYear)) * 100;

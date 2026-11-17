/*
 * Data for specs: what the API returns, cut down to what the app reads.
 */
import type { Hotel, Insight, Kpis, MetricUnit, MetricValue } from '@shared/types';
import { users } from '@shared/users';
import type { HotelDirectory } from '../core/api/api.service';

/** Mark is the general manager of Hotel Central; Sofia the revenue director of the resort. */
export const [mark, sofia] = users;

export const hotels: Hotel[] = [
  {
    id: 'hotel-central',
    name: 'Hotel Central Brussels',
    city: 'Brussels',
    type: 'city',
    rooms: 180,
    currency: 'EUR',
    otherOperatingCostsPerDay: 9000,
    restaurantName: 'Brasserie Central',
    restaurantSeats: 90,
  },
  {
    id: 'marina-resort',
    name: 'Marina Resort Algarve',
    city: 'Vilamoura',
    type: 'resort',
    rooms: 240,
    currency: 'EUR',
    otherOperatingCostsPerDay: 12000,
    restaurantName: 'Mar Azul',
    restaurantSeats: 140,
  },
];

/** What /api/hotels answers. "Today" is Tuesday 17 November 2026. */
export const directory: HotelDirectory = {
  asOf: '2026-11-17',
  actuals: { from: '2024-11-18', to: '2026-11-17' },
  bookings: { stayFrom: '2026-11-18', stayTo: '2027-02-15' },
  hotels,
};

/** A figure with last year beside it. */
export const figure = (
  value: number,
  unit: MetricUnit,
  lastYear: number,
  delta: number,
): MetricValue => ({
  value,
  unit,
  lastYear: { value: lastYear, delta, deltaUnit: unit === 'percent' ? 'points' : 'percent' },
});

/** What /api/kpis answers for Hotel Central, month to date. */
export const kpis: Kpis = {
  hotelId: 'hotel-central',
  period: { from: '2026-11-01', to: '2026-11-17' },
  lastYearPeriod: { from: '2025-11-02', to: '2025-11-18' },
  roomsAvailable: figure(3060, 'count', 3060, 0),
  roomsSold: figure(2427, 'count', 2350, 3.3),
  occupancy: figure(79.3, 'percent', 76.8, 2.5),
  averageDailyRate: figure(156.2, 'currency', 150.5, 3.8),
  revenuePerAvailableRoom: figure(123.9, 'currency', 115.6, 7.2),
  netRevenuePerAvailableRoom: figure(113.1, 'currency', 105.6, 7.1),
  operatingProfit: figure(157_200, 'currency', 139_400, 12.8),
};

const profit: Insight = {
  id: 'hotel-central:profitVsLastYear',
  hotelId: 'hotel-central',
  severity: 'critical',
  category: 'profit',
  headline: 'Profit in October 2026 was 13.7% lower than a year earlier.',
  metric: 'operatingProfit',
  period: { from: '2026-10-01', to: '2026-10-31', label: 'October 2026' },
  delta: { value: -13.7, unit: 'percent' },
  chart: {
    type: 'bar',
    title: 'Revenue and profit',
    unit: 'currency',
    x: ['Revenue', 'Profit'],
    series: [
      { name: 'Last year', role: 'lastYear', data: [1_100_000, 344_173] },
      { name: 'This year', role: 'current', data: [1_105_000, 296_853] },
    ],
  },
  cause: 'Occupancy fell 8.7 points and rooms staffing cost rose 29.4%.',
  causeEvents: [
    {
      hotelId: 'hotel-central',
      date: '2026-09-28',
      kind: 'rate_change',
      title: 'Published rate +15% for October',
      detail: 'The published rate went up 15% for the trade-fair season.',
    },
  ],
  nextMove: 'Revisit the rate increase.',
  evidence: [
    {
      query: 'get_kpis',
      args: { hotelId: 'hotel-central', from: '2026-10-01', to: '2026-10-31' },
      rows: {
        occupancy: figure(68.2, 'percent', 76.9, -8.7),
        operatingProfit: figure(296_853, 'currency', 344_173, -13.7),
      },
    },
  ],
  rank: 1,
};

/** A finding as /api/insights returns it: the profit story, with whatever a spec changes. */
export const insight = (changes: Partial<Insight> = {}): Insight => ({ ...profit, ...changes });

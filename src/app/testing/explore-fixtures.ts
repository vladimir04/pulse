/*
 * What the API answers for Explore: Hotel Central, month to date, cut down to what the page reads.
 */
import type {
  ChannelPerformance,
  Event,
  RestaurantPerformance,
  StaffingPerformance,
  Timeseries,
} from '@shared/types';
import { figure } from './fixtures';

const period = { from: '2026-11-01', to: '2026-11-17' };
const lastYearPeriod = { from: '2025-11-02', to: '2025-11-18' };

/** /api/timeseries for occupancy by day, smoothed over seven days. */
export const occupancySeries: Timeseries = {
  metric: 'occupancy',
  unit: 'percent',
  grain: 'day',
  x: ['2026-11-01', '2026-11-02', '2026-11-03'],
  current: [78.1, 79.0, 79.6],
  lastYear: [76.2, 76.9, 77.0],
  rollingDays: 7,
};

/** /api/timeseries for the Monday–Thursday capture rate by week. */
export const captureSeries: Timeseries = {
  metric: 'restaurantCaptureRate',
  unit: 'percent',
  grain: 'week',
  x: ['2026-11-02', '2026-11-09'],
  current: [33.8, 34.1],
  lastYear: [43.0, 42.6],
};

export const events: Event[] = [
  {
    hotelId: 'hotel-central',
    date: '2026-11-03',
    kind: 'market',
    title: 'Two corporate accounts cut Q4 travel budgets',
    label: 'Corporate budgets cut',
    detail: 'Two corporate accounts announced lower travel budgets for the fourth quarter.',
  },
];

const department = (perRoom: number, perRoomLastYear: number, change: number) => ({
  cost: figure(perRoom * 2400, 'currency', perRoomLastYear * 2400, change),
  costPerOccupiedRoom: figure(perRoom, 'currency', perRoomLastYear, change),
});

export const staffing: StaffingPerformance = {
  hotelId: 'hotel-central',
  period,
  lastYearPeriod,
  byDepartment: {
    rooms: department(28.4, 26.9, 5.6),
    restaurant: department(11.2, 11.15, 0.4),
    front_desk: department(6.5, 6.5, 0),
  },
  staffingCost: figure(110_640, 'currency', 104_700, 5.7),
  staffingCostPerOccupiedRoom: figure(46.1, 'currency', 44.55, 3.5),
  staffingCostPercent: figure(24.1, 'percent', 23.6, 0.5),
};

const channel = (
  channelId: string,
  name: string,
  roomsSold: number,
  grossRevenue: number,
  distributionCost: number,
  ranks: [grossRevenue: number, netRate: number],
): ChannelPerformance => ({
  channelId,
  name,
  kind: channelId === 'direct' ? 'direct' : 'ota',
  roomsSold,
  bookings: Math.round(roomsSold / 2),
  shareOfRooms: 0,
  grossRevenue,
  distributionCost,
  netRevenue: grossRevenue - distributionCost,
  grossRate: grossRevenue / roomsSold,
  netRate: (grossRevenue - distributionCost) / roomsSold,
  grossRevenueRank: ranks[0],
  netRateRank: ranks[1],
});

/** /api/channel-performance, which answers by gross revenue. */
export const channels: ChannelPerformance[] = [
  channel('booking-com', 'Booking.com', 800, 128_000, 23_040, [1, 3]),
  channel('direct', 'Direct website', 600, 99_000, 1_200, [2, 1]),
  channel('expedia', 'Expedia', 300, 48_000, 7_200, [3, 2]),
];

const weekdays = {
  covers: figure(2100, 'count', 2600, -19.2),
  captureRate: figure(33.9, 'percent', 43.1, -9.2),
  revenuePerCover: figure(38, 'currency', 38, 0),
  margin: figure(19.7, 'percent', 20.5, -0.8),
};

export const restaurant: RestaurantPerformance = {
  hotelId: 'hotel-central',
  restaurantName: 'Brasserie Central',
  period,
  lastYearPeriod,
  covers: figure(4100, 'count', 4700, -12.8),
  revenue: figure(155_800, 'currency', 178_600, -12.8),
  ingredientCost: figure(49_800, 'currency', 57_100, -12.8),
  staffingCost: figure(75_000, 'currency', 75_000, 0),
  captureRate: figure(31.2, 'percent', 36.4, -5.2),
  revenuePerCover: figure(38, 'currency', 38, 0),
  margin: figure(19.9, 'percent', 26.0, -6.1),
  split: { monToThu: weekdays, friToSun: weekdays },
};

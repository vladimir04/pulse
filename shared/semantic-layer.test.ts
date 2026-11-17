import { describe, expect, it } from 'vitest';
import { getInsights } from './detectors';
import {
  averageDailyRate,
  bookingPace,
  distributionCost,
  emptyTotals,
  occupancy,
  operatingProfit,
  sameTimeLastYear,
  type Totals,
} from './metrics';
import type { HotelId } from './types';

describe('metrics', () => {
  // One day: 80 of 100 rooms sold at 100, a restaurant taking 2,000.
  const channels = [
    { roomRevenue: 5000, bookings: 20, commissionPercent: 0, costPerBooking: 2 },
    { roomRevenue: 3000, bookings: 10, commissionPercent: 18, costPerBooking: 0 },
  ];
  const day: Totals = {
    ...emptyTotals(),
    days: 1,
    roomsAvailable: 100,
    roomsSold: 80,
    roomRevenue: 8000,
    distributionCost: distributionCost(channels),
    restaurantRevenue: 2000,
    ingredientCost: 640,
    roomsStaffingCost: 2560,
    restaurantStaffingCost: 1400,
    frontDeskStaffingCost: 1060,
    otherOperatingCosts: 3000,
  };

  it('computes the formulas on a small fixture', () => {
    expect(occupancy(day)).toBe(0.8);
    expect(averageDailyRate(day)).toBe(100);
    expect(distributionCost(channels)).toBe(580); // 20 × 2 + 18% of 3,000
    expect(operatingProfit(day)).toBe(760); // 10,000 − 580 − 640 − 5,020 − 3,000
    expect(bookingPace(88, 100)).toBe(0.88);
    expect(sameTimeLastYear({ from: '2026-10-01', to: '2026-10-31' })).toEqual({
      from: '2025-10-02',
      to: '2025-11-01',
    });
  });
});

describe('planted stories', () => {
  const insight = (hotelId: HotelId, rule: string) =>
    getInsights({ hotelId }).find((candidate) => candidate.id === `${hotelId}:${rule}`);

  it('finds the three Hotel Central stories', () => {
    expect(insight('hotel-central', 'profitVsLastYear')).toMatchObject({
      severity: 'critical',
      period: { label: 'October 2026' },
    });
    expect(insight('hotel-central', 'bookingPace')).toMatchObject({
      severity: 'warning',
      period: { label: 'December 2026' },
    });
    expect(insight('hotel-central', 'restaurantCapture')?.severity).toBe('warning');
  });

  it('finds the three Marina Resort stories', () => {
    expect(insight('marina-resort', 'bookingPace')?.severity).toBe('positive');
    expect(insight('marina-resort', 'channelNetRate')?.severity).toBe('warning');
    expect(insight('marina-resort', 'directShare')?.severity).toBe('positive');
  });
});

import { describe, expect, it } from 'vitest';
import { explore } from './narratives';
import {
  getEvents,
  getKpis,
  getRestaurantPerformance,
  getTimeseries,
  timeseriesInput,
} from './queries';

const CENTRAL = 'hotel-central';

describe('a smoothed series', () => {
  const week = { hotelId: CENTRAL, from: '2026-10-01', to: '2026-10-07' } as const;
  const smoothed = getTimeseries({ ...week, metric: 'occupancy', grain: 'day', rollingDays: 7 });

  it('gives each day the metric of the seven days that end on it', () => {
    // The last point covers 1–7 October, the first 25 September–1 October.
    expect(smoothed.x).toHaveLength(7);
    expect(smoothed.current.at(-1)).toBe(getKpis(week).occupancy.value);
    expect(smoothed.current[0]).toBe(
      getKpis({ hotelId: CENTRAL, from: '2026-09-25', to: '2026-10-01' }).occupancy.value,
    );
  });

  it('smooths last year the same way', () => {
    expect(smoothed.lastYear.at(-1)).toBe(getKpis(week).occupancy.lastYear?.value);
  });

  it('is only offered for daily points', () => {
    const weekly = { ...week, metric: 'occupancy', grain: 'week', rollingDays: 7 };

    expect(timeseriesInput.safeParse(weekly).success).toBe(false);
    expect(timeseriesInput.safeParse({ ...weekly, grain: 'day' }).success).toBe(true);
  });
});

describe('events', () => {
  it('include the ones still running in the period, with a short label', () => {
    const midOctober = getEvents({ hotelId: CENTRAL, from: '2026-10-10', to: '2026-10-15' });

    expect(midOctober.map(({ label, date, endDate }) => [label, date, endDate])).toEqual([
      ['Published rate +15%', '2026-09-28', '2026-10-31'],
      ['Housekeeping sick leave', '2026-10-06', '2026-10-24'],
    ]);
  });
});

describe('the restaurant on Mondays to Thursdays', () => {
  it('has its own margin, compared with last year', () => {
    const { split } = getRestaurantPerformance({
      hotelId: CENTRAL,
      from: '2026-10-01',
      to: '2026-10-31',
    });

    expect(split.monToThu.margin.unit).toBe('percent');
    expect(split.monToThu.margin.lastYear).not.toBeNull();
    expect(split.monToThu.margin.value).not.toBe(split.friToSun.margin.value);
  });
});

describe('what a panel of Explore says', () => {
  it('compares occupancy with the same weekdays last year', () => {
    expect(explore.occupancy(68.2, -8.7)).toBe(
      'Occupancy averaged 68.2% over this period, 8.7 points below the same weekdays last year.',
    );
    expect(explore.occupancy(79.3, 0.4)).toBe(
      'Occupancy averaged 79.3% over this period, in line with the same weekdays last year.',
    );
    expect(explore.occupancy(79.3)).toBe('Occupancy averaged 79.3% over this period.');
  });

  it('names the department whose staff cost moved most', () => {
    const departments = [
      { name: 'rooms', now: 39.08, before: 26.99 },
      { name: 'restaurant', now: 11.2, before: 10.4 },
    ];

    expect(explore.staffing({ now: 57.02, before: 43.75 }, departments)).toBe(
      'Staff cost €57.02 per occupied room, €13.27 more than last year. Rooms changed most, up €12.09.',
    );
    expect(explore.staffing({ now: 45.4, before: 45.3 }, departments)).toBe(
      'Staff cost €45.40 per occupied room, about the same as last year.',
    );
    expect(explore.staffing({ now: 45.4 }, [])).toBe('Staff cost €45.40 per occupied room.');
  });

  it('says where the channel with the most revenue ranks once its costs are counted', () => {
    const direct = { name: 'Direct website', grossRevenueRank: 2, netRateRank: 1 };

    expect(
      explore.channels([direct, { name: 'Booking.com', grossRevenueRank: 1, netRateRank: 3 }]),
    ).toBe('Booking.com brings the most gross revenue but ranks third on net rate.');
    expect(explore.channels([{ ...direct, grossRevenueRank: 1 }])).toBe(
      'Direct website brings the most gross revenue and also keeps the most per room night.',
    );
  });

  it('gives the weekday capture rate and what a cover brings in', () => {
    expect(explore.restaurant({ value: 28.5, points: -5.2 }, { value: 38, percentChange: 0 })).toBe(
      'Monday–Thursday capture was 28.5%, 5.2 points below last year. Revenue per cover was €38.00, unchanged.',
    );
    expect(explore.restaurant({ value: 28.5 }, { value: 38 })).toBe(
      'Monday–Thursday capture was 28.5%. Revenue per cover was €38.00.',
    );
  });
});

import { describe, expect, it } from 'vitest';
import { figure } from '../../testing/fixtures';
import { evidenceGroups } from './evidence';

describe('evidenceGroups', () => {
  /** The rows for one query's result. */
  const rows = (result: unknown) =>
    evidenceGroups([{ query: 'get_anything', args: {}, rows: result }])[0].rows;

  it('heads each query with what it looked at and for when, in the order they ran', () => {
    const groups = evidenceGroups([
      {
        query: 'get_kpis',
        args: { hotelId: 'hotel-central', from: '2026-10-01', to: '2026-10-31' },
        rows: {},
      },
      { query: 'get_events', args: { hotelId: 'hotel-central' }, rows: [] },
    ]);

    expect(groups.map((group) => group.heading)).toEqual(['Key figures · October 2026', 'Events']);
  });

  it('writes a figure with last year and the change', () => {
    expect(
      rows({ hotelId: 'hotel-central', occupancy: figure(68.2, 'percent', 76.9, -8.7) }),
    ).toEqual([
      {
        label: 'Occupancy',
        value: '68.2%',
        lastYear: '76.9%',
        change: { text: '−8.7 pts', tone: 'worse' },
      },
    ]);
  });

  it('reads a cost that fell as better, and a change under one as flat', () => {
    const [cost, occupancy] = rows({
      byDepartment: { rooms: { cost: figure(51_000, 'currency', 60_000, -15) } },
      occupancy: figure(77.3, 'percent', 76.9, 0.4),
    });

    expect(cost).toMatchObject({
      label: 'Rooms · cost',
      change: { text: '−15.0%', tone: 'better' },
    });
    expect(occupancy.change).toEqual({ text: '+0.4 pts', tone: 'flat' });
  });

  it('shows a dash where there is no last year to compare with', () => {
    expect(rows({ occupancy: { value: 68.2, unit: 'percent', lastYear: null } })).toEqual([
      { label: 'Occupancy', value: '68.2%', lastYear: '—' },
    ]);
  });

  it('lists booking channels by what the hotel keeps per room night', () => {
    expect(
      rows([{ name: 'Booking.com', netRate: 144.2, netRateRank: 3, grossRevenueRank: 1 }]),
    ).toEqual([
      {
        label: 'Booking.com · kept per room night (rank 3; rank 1 on revenue)',
        value: '€144',
        lastYear: '—',
      },
    ]);
  });

  it('lists events with their date', () => {
    expect(rows([{ title: 'Published rate +15% for October', date: '2026-09-28' }])).toEqual([
      { label: 'Published rate +15% for October', value: '28 Sep', lastYear: '—' },
    ]);
  });

  it('compares bookings for future stays with the same point last year', () => {
    expect(
      rows({
        roomsBookedNow: 1766,
        roomsBookedSameTimeLastYear: 2009,
        pickup14: 230,
        lastYearPickup14: 383,
        roomsRemaining: 3814,
      }),
    ).toEqual([
      {
        label: 'Rooms booked',
        value: '1,766',
        lastYear: '2,009',
        change: { text: '−12.1%', tone: 'worse' },
      },
      {
        label: 'Rooms booked in the last 14 days',
        value: '230',
        lastYear: '383',
        change: { text: '−39.9%', tone: 'worse' },
      },
      { label: 'Rooms still unsold', value: '3,814', lastYear: '—' },
    ]);
  });

  it('points to the chart for a series over time instead of listing every point', () => {
    expect(
      rows({
        metric: 'occupancy',
        grain: 'week',
        x: ['2026-11-02', '2026-11-09', '2026-11-16'],
        current: [78.1, 80.2, 79.4],
        lastYear: [76.0, 77.5, null],
      }),
    ).toEqual([
      { label: 'Occupancy by week, shown in the chart', value: '3 points', lastYear: '—' },
    ]);
  });
});

import { describe, expect, it } from 'vitest';
import { evidenceTitle, periodPhrase } from './evidence';

/** The dataset's "today". */
const AS_OF = '2026-11-17';

describe('evidenceTitle', () => {
  const october = { hotelId: 'hotel-central', from: '2026-10-01', to: '2026-10-31' };

  it('says what was looked at and for when, without the tool or the hotel', () => {
    expect(evidenceTitle('get_kpis', october, AS_OF)).toBe('Key figures · October 2026');
    expect(evidenceTitle('get_staffing', october, AS_OF)).toBe('Staff cost · October 2026');
    expect(evidenceTitle('get_channel_performance', { from: '2026-08-20', to: AS_OF }, AS_OF)).toBe(
      'Booking channels · last 90 days',
    );
  });

  it('names a series by its metric and the size of its points', () => {
    expect(
      evidenceTitle(
        'get_timeseries',
        {
          metric: 'restaurantCaptureRate',
          grain: 'week',
          weekdays: 'monToThu',
          from: '2026-06-01',
          to: AS_OF,
        },
        AS_OF,
      ),
    ).toBe('Restaurant capture rate by week, Monday–Thursday · 1 Jun–17 Nov 2026');
  });

  it('reads the stay dates of bookings as the period', () => {
    expect(
      evidenceTitle('get_booking_pace', { stayFrom: '2026-12-01', stayTo: '2026-12-31' }, AS_OF),
    ).toBe('Rooms on the books · December 2026');
  });

  it('leaves the period out when the query has none, and still reads without a title', () => {
    expect(evidenceTitle('list_hotels', {})).toBe('Hotels');
    expect(evidenceTitle('get_room_types', {})).toBe('room types');
  });
});

describe('periodPhrase', () => {
  it('names a period that ends today by its length', () => {
    expect(periodPhrase({ from: '2026-08-26', to: AS_OF }, AS_OF)).toBe('last 12 weeks');
    expect(periodPhrase({ from: '2026-10-19', to: AS_OF }, AS_OF)).toBe('last 30 days');
  });

  it('gives the dates of any other period', () => {
    expect(periodPhrase({ from: '2026-06-02', to: '2026-08-24' }, AS_OF)).toBe('2 Jun–24 Aug 2026');
    expect(periodPhrase({ from: '2026-11-01', to: AS_OF }, AS_OF)).toBe('1–17 Nov 2026');
  });
});

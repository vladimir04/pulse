import { describe, expect, it } from 'vitest';
import {
  formatAxisDate,
  formatAxisValue,
  formatCurrency,
  formatDate,
  formatDayMonth,
  formatDelta,
  formatLongDate,
  formatPercent,
  formatPeriod,
  formatPoints,
  formatRange,
  formatValue,
} from './format';

describe('format', () => {
  it('writes money compactly from a thousand up', () => {
    expect([formatCurrency(186.4), formatCurrency(12_400), formatCurrency(214_000)]).toEqual([
      '€186',
      '€12.4k',
      '€214k',
    ]);
    expect([formatCurrency(222_000, { fixed: true }), formatCurrency(-1_331_312)]).toEqual([
      '€222.0k',
      '−€1.33M',
    ]);
  });

  it('writes a million rather than a thousand thousands', () => {
    expect([formatCurrency(999_949), formatCurrency(999_950)]).toEqual(['€999.9k', '€1.00M']);
  });

  it('writes percents and points with one decimal and a real minus sign', () => {
    expect([formatPercent(68.2), formatPercent(-13.7, { signed: true })]).toEqual([
      '68.2%',
      '−13.7%',
    ]);
    expect([formatPoints(-8.8), formatPoints(2.1)]).toEqual(['−8.8 pts', '+2.1 pts']);
  });

  it('writes a value in the unit it is measured in', () => {
    expect([
      formatValue(68.2, 'percent'),
      formatValue(12_400, 'currency'),
      formatValue(3120, 'count'),
      formatValue(0.88, 'ratio'),
    ]).toEqual(['68.2%', '€12.4k', '3,120', '0.88']);
    expect([formatAxisValue(80, 'percent'), formatAxisValue(72.5, 'percent')]).toEqual([
      '80%',
      '72.5%',
    ]);
  });

  it('writes a change with its sign, in points or percent', () => {
    expect([
      formatDelta(-8.8, 'points'),
      formatDelta(12.4, 'percent'),
      formatDelta(0, 'percent'),
    ]).toEqual(['−8.8 pts', '+12.4%', '0.0%']);
  });

  it('writes dates as weekday, day and month', () => {
    expect(formatDate('2026-11-17')).toBe('Tue 17 Nov');
    expect(formatLongDate('2026-11-17')).toBe('Tuesday 17 November');
    expect(formatDayMonth('2026-09-28')).toBe('28 Sep');
  });

  it('writes a chart’s date labels short and leaves other labels alone', () => {
    expect([
      formatAxisDate('2026-09-28'),
      formatAxisDate('2026-09'),
      formatAxisDate('Revenue'),
    ]).toEqual(['28 Sep', 'Sep', 'Revenue']);
  });

  it('repeats only what differs between the ends of a range', () => {
    expect(formatRange({ from: '2026-10-01', to: '2026-10-31' })).toBe('1–31 Oct 2026');
    expect(formatRange({ from: '2026-08-20', to: '2026-11-17' })).toBe('20 Aug–17 Nov 2026');
    expect(formatRange({ from: '2025-11-18', to: '2026-11-17' })).toBe('18 Nov 2025–17 Nov 2026');
    expect(formatRange({ from: '2026-10-01', to: '2026-10-31' }, { year: false })).toBe('1–31 Oct');
  });

  it('names a whole calendar month and writes any other period as a range', () => {
    expect(formatPeriod({ from: '2026-10-01', to: '2026-10-31' })).toBe('October 2026');
    expect(formatPeriod({ from: '2026-11-01', to: '2026-11-17' })).toBe('1–17 Nov 2026');
  });
});

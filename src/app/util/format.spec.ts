import { describe, expect, it } from 'vitest';
import { formatCurrency, formatDate, formatPercent, formatPoints } from './format';

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

  it('writes percents and points with one decimal and a real minus sign', () => {
    expect([formatPercent(68.2), formatPercent(-13.7, { signed: true })]).toEqual([
      '68.2%',
      '−13.7%',
    ]);
    expect([formatPoints(-8.8), formatPoints(2.1)]).toEqual(['−8.8 pts', '+2.1 pts']);
  });

  it('writes dates as weekday, day and month', () => {
    expect(formatDate('2026-11-17')).toBe('Tue 17 Nov');
  });
});

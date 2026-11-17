import { describe, expect, it } from 'vitest';
import { lastDays, lastFullMonth, monthToDate } from './date';

describe('date', () => {
  it('counts both ends of the last days', () => {
    expect(lastDays('2026-11-17', 30)).toEqual({ from: '2026-10-19', to: '2026-11-17' });
    expect(lastDays('2026-11-17', 1)).toEqual({ from: '2026-11-17', to: '2026-11-17' });
  });

  it('runs month to date from the first of the month', () => {
    expect(monthToDate('2026-11-17')).toEqual({ from: '2026-11-01', to: '2026-11-17' });
  });

  it('takes the month before, unless today completes this one', () => {
    expect(lastFullMonth('2026-11-17')).toEqual({ from: '2026-10-01', to: '2026-10-31' });
    expect(lastFullMonth('2026-11-30')).toEqual({ from: '2026-11-01', to: '2026-11-30' });
  });

  it('crosses a year end and knows a leap February', () => {
    expect(lastFullMonth('2026-01-15')).toEqual({ from: '2025-12-01', to: '2025-12-31' });
    expect(lastFullMonth('2024-03-10')).toEqual({ from: '2024-02-01', to: '2024-02-29' });
  });
});

import { describe, expect, it } from 'vitest';
import { getInsights } from './detectors';
import { authenticate, greeting, type Role } from './users';

describe('mock users', () => {
  it('accepts a known email with any non-empty password', () => {
    expect(authenticate('Mark@Pulse.com', 'anything')?.firstName).toBe('Mark');
    expect(authenticate('mark@pulse.com', '')).toBeUndefined();
    expect(authenticate('nobody@pulse.com', 'anything')).toBeUndefined();
  });

  it('greets by the time of day', () => {
    const at = (hour: number) => greeting(new Date(2026, 10, 17, hour));
    expect([at(9), at(14), at(20)]).toEqual(['Morning', 'Afternoon', 'Evening']);
  });
});

describe('ranking for a role', () => {
  const first = (role?: Role) => getInsights({ hotelId: 'hotel-central', role })[0].category;

  it('moves the categories the role cares about up', () => {
    expect(first()).toBe('profit');
    expect(first('fnb_manager')).toBe('restaurant');
  });
});

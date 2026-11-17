import { addDays } from '@shared/metrics';
import type { Period } from '@shared/types';

/** The `days` days that end on `to`, both ends included. */
export const lastDays = (to: string, days: number): Period => ({
  from: addDays(to, 1 - days),
  to,
});

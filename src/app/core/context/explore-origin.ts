import type { HotelId, Period } from '@shared/types';

/**
 * What "View in Explore" on a Briefing insight hands over, in the navigation's state under
 * `openedFrom`, so Explore can say which insight it was opened from.
 */
export interface ExploreOrigin {
  headline: string;
  hotelId: HotelId;
  period: Period;
}

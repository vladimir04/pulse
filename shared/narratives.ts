/*
 * The words of an insight. Plain string templates: the detectors decide what happened and pass
 * the numbers in. Headlines avoid hotel shorthand; causes name the event; next moves are one
 * imperative sentence picked by the dominant factor.
 */
import type { ChannelPerformance, Event } from './types';

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/** Sizes are written without a sign; the words around them carry the direction. */
const number = (value: number, digits = 0): string =>
  Math.abs(value).toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
const euros = (value: number, digits = 0): string => `€${number(value, digits)}`;
const percent = (value: number): string => `${number(value, 1)}%`;
/** An estimated amount, rounded to two significant figures. */
const about = (value: number): string => {
  const step = 10 ** Math.max(Math.floor(Math.log10(Math.abs(value) || 1)) - 1, 0);
  return `about ${euros(Math.round(value / step) * step)}`;
};
const sentence = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1);
const ordinal = (rank: number): string => ['1st', '2nd', '3rd'][rank - 1] ?? `${rank}th`;

export const monthLabel = (date: string): string =>
  `${MONTHS[Number(date.slice(5, 7)) - 1]} ${date.slice(0, 4)}`;
const dayLabel = (date: string): string => `${Number(date.slice(8, 10))} ${monthLabel(date)}`;
const eventList = (events: Event[]): string =>
  events.map((event) => `${event.title} (${dayLabel(event.date)})`).join('; ');
const after = (lead: string, events: Event[]): string =>
  events.length ? ` ${lead}: ${eventList(events)}.` : '';

// ---------------------------------------------------------------------------------------------
// Profit against last year
// ---------------------------------------------------------------------------------------------

export type ProfitFactor =
  | 'occupancy'
  | 'rate'
  | 'roomsOutOfService'
  | 'distribution'
  | 'restaurant'
  | 'roomsStaffing'
  | 'restaurantStaffing'
  | 'frontDeskStaffing';

export interface ProfitDriver {
  factor: ProfitFactor;
  /** What the factor added to (or took from) profit against last year */
  euros: number;
  /** The underlying change: points for occupancy, room nights for rooms out of service, percent otherwise */
  change: number;
}

const moreOrLess = (effect: number): string => (effect < 0 ? 'less' : 'more');
const roseOrFell = (change: number): string => (change < 0 ? 'fell' : 'rose');
const staffingDriver =
  (department: string) =>
  ({ euros: effect, change }: ProfitDriver): string =>
    `${department} staffing cost ${roseOrFell(change)} ${percent(change)} (${about(effect)} ${effect < 0 ? 'more' : 'less'})`;

const driverText: Record<ProfitFactor, (driver: ProfitDriver) => string> = {
  occupancy: ({ euros: effect, change }) =>
    `occupancy ${roseOrFell(change)} ${number(change, 1)} points (${about(effect)} ${moreOrLess(effect)} room revenue)`,
  rate: ({ euros: effect, change }) =>
    `the average room rate ${roseOrFell(change)} ${percent(change)} (${about(effect)} ${moreOrLess(effect)} room revenue)`,
  roomsOutOfService: ({ euros: effect, change }) =>
    `${number(change)} ${change < 0 ? 'fewer' : 'more'} room nights were available to sell (${about(effect)} ${moreOrLess(effect)} room revenue)`,
  distribution: ({ euros: effect, change }) =>
    `booking channel fees ${roseOrFell(change)} ${percent(change)} (${about(effect)} ${effect < 0 ? 'more' : 'less'})`,
  restaurant: ({ euros: effect }) =>
    `the restaurant earned ${about(effect)} ${moreOrLess(effect)} after ingredients`,
  roomsStaffing: staffingDriver('rooms'),
  restaurantStaffing: staffingDriver('restaurant'),
  frontDeskStaffing: staffingDriver('front desk'),
};

const profitMoves: Record<ProfitFactor, [whenDown: string, whenUp: string]> = {
  occupancy: [
    'Win back the lost room nights: find the days and channels that emptied out and reprice those first.',
    'Hold on to the extra room nights: keep rates firm on the days that now fill.',
  ],
  rate: [
    'Stop the slide in room rates: check which channels and discounts pulled the average price down.',
    'Keep the higher room rates and watch that bookings hold up.',
  ],
  roomsOutOfService: [
    'Get the out-of-service rooms back on sale before the next busy period.',
    'Keep the extra rooms on sale.',
  ],
  distribution: [
    'Cut booking channel fees: move bookings to the channels that cost least.',
    'Keep steering bookings to the channels that cost least.',
  ],
  restaurant: [
    'Rebuild restaurant earnings: look at guest numbers and spending per meal.',
    'Build on the restaurant’s stronger earnings.',
  ],
  roomsStaffing: [
    'Bring rooms staffing back to plan: cap agency hours and match the rota to rooms sold.',
    'Keep rooms staffing at this level.',
  ],
  restaurantStaffing: [
    'Bring restaurant staffing back to plan: match the rota to the meals served.',
    'Keep restaurant staffing at this level.',
  ],
  frontDeskStaffing: [
    'Bring front desk staffing back to plan: match the rota to arrivals.',
    'Keep front desk staffing at this level.',
  ],
};

export const profit = {
  headline: (label: string, change: number, now: number, before: number): string =>
    `Profit in ${label} was ${percent(change)} ${change < 0 ? 'lower' : 'higher'} than a year earlier (${euros(now)} against ${euros(before)}).`,

  cause: (drivers: ProfitDriver[], offset: ProfitDriver | undefined, events: Event[]): string => {
    const main = drivers.map((driver) => driverText[driver.factor](driver)).join(' and ');
    const against = offset
      ? ` ${sentence(driverText[offset.factor](offset))}, which offset part of this.`
      : '';
    return `${sentence(main)}.${against}${after('Behind this', events)}`;
  },

  nextMove: (dominant: ProfitFactor, down: boolean, events: Event[]): string =>
    dominant === 'occupancy' && down && events.some((event) => event.kind === 'rate_change')
      ? 'Revisit the rate increase: lower public rates on the days that emptied out and watch bookings for two weeks.'
      : profitMoves[dominant][down ? 0 : 1],
};

// ---------------------------------------------------------------------------------------------
// Bookings for the coming month
// ---------------------------------------------------------------------------------------------

export const pace = {
  headline: (label: string, change: number, now: number, before: number): string =>
    `${label} has ${percent(change)} ${change < 0 ? 'fewer' : 'more'} rooms booked than at this point last year (${number(now)} against ${number(before)}).`,

  cause: (label: string, pickup: number, pickupLastYear: number, events: Event[]): string =>
    `Over the last 14 days ${number(pickup)} rooms were booked for ${label}, against ${number(pickupLastYear)} in the same 14 days last year.${after('Recent market news', events)}`,

  nextMove: (label: string, behind: boolean, pickupIsWeak: boolean): string => {
    if (!behind)
      return `Protect the lead for ${label}: hold rates on the busiest dates instead of discounting.`;
    return pickupIsWeak
      ? `Replace the missing demand for ${label}: put a time-limited offer on the weakest stay weeks and call the accounts that have gone quiet.`
      : `Close the gap for ${label}: bookings now arrive as fast as last year, so target the stay weeks that started behind.`;
  },
};

// ---------------------------------------------------------------------------------------------
// Restaurant, Mondays to Thursdays
// ---------------------------------------------------------------------------------------------

export interface RestaurantFacts {
  revenuePerCover: { now: number; before: number };
  /** Restaurant staffing cost, percent change between the two windows */
  staffingChange: number;
  margin: { now: number; before: number };
}

export const restaurant = {
  headline: (name: string, now: number, before: number): string =>
    `${name} served ${number(now)} meals for every 100 hotel guests on Mondays to Thursdays over the last 12 weeks, down from ${number(before)} in the 12 weeks before.`,

  cause: (
    { revenuePerCover, staffingChange, margin }: RestaurantFacts,
    events: Event[],
  ): string => {
    const spending =
      Math.abs(revenuePerCover.now - revenuePerCover.before) < 0.01 * revenuePerCover.before
        ? `is unchanged at ${euros(revenuePerCover.now, 2)}`
        : `went from ${euros(revenuePerCover.before, 2)} to ${euros(revenuePerCover.now, 2)}`;
    const staff =
      Math.abs(staffingChange) < 3
        ? 'is unchanged'
        : `${roseOrFell(staffingChange)} ${percent(staffingChange)}`;
    return `Spending per meal ${spending} and restaurant staffing cost ${staff}, so the restaurant kept ${percent(margin.now)} of its revenue after ingredients and staff, against ${percent(margin.before)} before.${after('The drop follows', events)}`;
  },

  nextMove: (events: Event[]): string =>
    events.length
      ? 'Review the change behind the drop: run the previous weekday offer alongside the new one for two weeks and compare guest numbers.'
      : 'Find out why weekday guests eat elsewhere: ask at check-out and review the weekday menu and prices.',
};

// ---------------------------------------------------------------------------------------------
// Booking channels
// ---------------------------------------------------------------------------------------------

export const channels = {
  /** The channel with the most revenue is not the one that leaves the most per room night. */
  mismatchHeadline: (top: ChannelPerformance, best: ChannelPerformance, gap: number): string =>
    `${top.name} brings in the most room revenue, but after its fees the hotel keeps ${euros(top.netRate)} per room night there against ${euros(best.netRate)} through ${best.name} (${percent(gap)} less).`,

  /** A channel earns much less per room night than last year while a promotion runs. */
  promotionHeadline: (channel: ChannelPerformance, drop: number): string =>
    `${channel.name} left the hotel ${percent(drop)} less per room night after fees than a year earlier.`,

  bestHeadline: (best: ChannelPerformance): string =>
    `${best.name} is the most profitable channel: it brings in the most room revenue and leaves the hotel ${euros(best.netRate)} per room night after fees.`,

  cause: (channel: ChannelPerformance, count: number, promotions: Event[]): string =>
    `${channel.name} sold ${percent(channel.shareOfRooms)} of room nights and took ${euros(channel.distributionCost)} in fees, which puts it ${ordinal(channel.netRateRank)} of ${count} channels on what the hotel keeps per room night.${after('Promotion in the period', promotions)}`,

  nextMove: (top: ChannelPerformance, best: ChannelPerformance): string =>
    top === best
      ? `Keep growing ${best.name}: it is both the largest and the most profitable channel.`
      : `Move bookings from ${top.name} to ${best.name}: offer the best public price there and limit discounts on ${top.name}.`,
};

// ---------------------------------------------------------------------------------------------
// Direct bookings
// ---------------------------------------------------------------------------------------------

export const directShare = {
  headline: (now: number, before: number): string =>
    `Bookings made directly with the hotel were ${percent(now)} of rooms sold over the last 180 days, ${now > before ? 'up' : 'down'} from ${percent(before)} a year earlier.`,

  cause: (
    feeShare: { now: number; before: number },
    feeChange: number,
    promotions: Event[],
  ): string =>
    `Booking channel fees took ${percent(feeShare.now)} of room revenue against ${percent(feeShare.before)} a year earlier (${percent(feeChange)} ${feeChange < 0 ? 'less' : 'more'} in euros).${after('Promotions in this period', promotions)}`,

  nextMove: (up: boolean): string =>
    up
      ? 'Keep the direct offer running and track how many of these guests book direct again.'
      : 'Win back direct bookings: check that the hotel website shows the best public price and promote it to past guests.',
};

// ---------------------------------------------------------------------------------------------
// Staffing
// ---------------------------------------------------------------------------------------------

export interface DepartmentCost {
  name: string;
  /** Cost for every room sold */
  now: number;
  before: number;
  /** Percent change */
  change: number;
}

export const staffing = {
  headline: (label: string, now: number, before: number, change: number): string =>
    `Staff cost ${euros(now, 2)} for every room sold in ${label}, ${percent(change)} more than a year earlier (${euros(before, 2)}).`,

  cause: (department: DepartmentCost, events: Event[]): string =>
    `${sentence(department.name)} staffing rose most: ${euros(department.now, 2)} for every room sold against ${euros(department.before, 2)} (${percent(department.change)} more).${after('Behind this', events)}`,

  nextMove: (department: DepartmentCost): string =>
    `Bring ${department.name} staffing back to plan: cap agency and overtime hours and match the rota to rooms sold.`,
};

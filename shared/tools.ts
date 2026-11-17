/*
 * One registry of tools. The Worker serves each as GET /api/<name> and registers each with the
 * MCP server, so the API, the MCP tools and their input validation cannot drift apart.
 */
import { z } from 'zod';
import { getInsights, insightsInput } from './detectors';
import { glossary, glossaryEntry } from './glossary';
import type { MetricKey } from './metrics';
import {
  bookingPaceInput,
  channelPerformanceInput,
  eventsInput,
  getAsOf,
  getBookingPace,
  getChannelPerformance,
  getCoverage,
  getEvents,
  getHotels,
  getKpis,
  getRestaurantPerformance,
  getStaffing,
  getTimeseries,
  hotelsInput,
  kpisInput,
  restaurantPerformanceInput,
  staffingInput,
  timeseriesInput,
} from './queries';
import type { MetricUnit } from './types';

export interface Tool {
  name: string;
  /** The GET route that serves the tool */
  path: string;
  description: string;
  schema: z.ZodObject;
  /** Checks the input against the schema, then runs the query. Throws a ZodError on bad input. */
  run(input: unknown): unknown;
}

export function defineTool<Schema extends z.ZodObject>(tool: {
  name: string;
  description: string;
  schema: Schema;
  run: (args: z.infer<Schema>) => unknown;
}): Tool {
  return {
    name: tool.name,
    // get_channel_performance → /api/channel-performance
    path: `/api/${tool.name.replace(/^(get|list)_/, '').replaceAll('_', '-')}`,
    description: tool.description,
    schema: tool.schema,
    run: (input) => tool.run(tool.schema.parse(input)),
  };
}

// The descriptions are written for a language model: what comes back, in which units, and how
// each number is defined, so it can reason about the results without recomputing them.

const coverage = getCoverage();
const CONVENTIONS =
  `Dates are ISO YYYY-MM-DD. The dataset's "today" is asOf = ${getAsOf()}: daily actuals run from ` +
  `${coverage.actuals.from} to asOf, and nothing later is known except bookings for stays up to ` +
  `${coverage.bookings.stayTo}. Percent values are on a 0–100 scale and money is in EUR. ` +
  '"lastYear" is always the same weekdays 364 days earlier; its delta is in points for percent ' +
  'values and in percent for everything else, and it is null where the data does not go back that far.';

const UNITS: Record<MetricUnit, string> = {
  percent: 'percent',
  currency: 'EUR',
  count: 'count',
  ratio: 'ratio, 1 = level',
};
const formulas = (...keys: MetricKey[]): string =>
  keys
    .map((key) => {
      const { label, formula, unit } = glossaryEntry(key);
      return `${key} (${label}) = ${formula} [${UNITS[unit]}]`;
    })
    .join('; ');

export const tools: Tool[] = [
  defineTool({
    name: 'list_hotels',
    description:
      'The hotels, with id, name, city, type, rooms and restaurant, plus asOf and the date ranges ' +
      `that have data. Call it first: every other tool needs a hotelId. ${CONVENTIONS}`,
    schema: hotelsInput,
    run: () => ({ asOf: getAsOf(), ...coverage, hotels: getHotels() }),
  }),
  defineTool({
    name: 'list_metrics',
    description:
      'The glossary: every metric with its key, hotelier label, full name, formula, plain-English ' +
      'meaning, unit, and whether up or down is good news. The keys are the metric names used by ' +
      'get_timeseries and in insights.',
    schema: z.object({}),
    run: () => glossary,
  }),
  defineTool({
    name: 'get_kpis',
    description:
      'Headline results of one hotel over a period, each with last year: rooms available and ' +
      `rooms sold (room nights), and ${formulas(
        'occupancy',
        'averageDailyRate',
        'revenuePerAvailableRoom',
        'netRevenuePerAvailableRoom',
        'operatingProfit',
      )}. ${CONVENTIONS}`,
    schema: kpisInput,
    run: getKpis,
  }),
  defineTool({
    name: 'get_timeseries',
    description:
      'One metric of one hotel over time, by day, week or month, with last year alongside: x holds ' +
      'the bucket labels (date, Monday of the week, or YYYY-MM), current and lastYear the values in ' +
      'the returned unit. Works for every glossary metric except bookingPace and bookingPickup; ' +
      'list_metrics gives the keys and formulas. Use it to see when something changed. ' +
      CONVENTIONS,
    schema: timeseriesInput,
    run: getTimeseries,
  }),
  defineTool({
    name: 'get_channel_performance',
    description:
      'Each booking channel of one hotel over a period, sorted by gross revenue: roomsSold (room ' +
      'nights), bookings, shareOfRooms (percent of rooms sold), grossRevenue, distributionCost, ' +
      'netRevenue, grossRate and netRate (EUR per room night before and after the channel’s cost), ' +
      'and the rank on gross revenue and on net rate, where 1 is best. ' +
      `${formulas('distributionCost', 'netRoomRevenue', 'netRate')}. ${CONVENTIONS}`,
    schema: channelPerformanceInput,
    run: getChannelPerformance,
  }),
  defineTool({
    name: 'get_booking_pace',
    description:
      'Rooms already booked for future stay dates of one hotel, as of asOf, against the same point ' +
      'last year. roomsBookedNow and roomsBookedSameTimeLastYear are room nights; paceRatio below 1 ' +
      'means behind last year; pickup7, pickup14 and pickup28 are the rooms added in the last 7, 14 ' +
      'and 28 days and lastYearPickup14 the rooms added in the same 14 days last year; ' +
      'roomsRemaining is what is still unsold; byWeek splits the stay dates by week (Monday start). ' +
      `${formulas('bookingPace', 'bookingPickup')}. Stay dates must lie after asOf. ${CONVENTIONS}`,
    schema: bookingPaceInput,
    run: getBookingPace,
  }),
  defineTool({
    name: 'get_restaurant_performance',
    description:
      'The hotel’s restaurant over a period, each number with last year: covers (meals served), ' +
      'revenue, ingredientCost, staffingCost (restaurant staff only), captureRate, revenuePerCover ' +
      'and margin, plus covers, captureRate and revenuePerCover split into Monday–Thursday and ' +
      `Friday–Sunday. ${formulas('restaurantCaptureRate', 'revenuePerCover', 'restaurantMargin')}. ` +
      CONVENTIONS,
    schema: restaurantPerformanceInput,
    run: getRestaurantPerformance,
  }),
  defineTool({
    name: 'get_staffing',
    description:
      'Staff cost of one hotel over a period, each number with last year: cost and cost per ' +
      'occupied room for each department (rooms, restaurant, front_desk), and for the hotel ' +
      `${formulas('staffingCost', 'staffingCostPerOccupiedRoom', 'staffingCostPercent')}. ` +
      CONVENTIONS,
    schema: staffingInput,
    run: getStaffing,
  }),
  defineTool({
    name: 'get_events',
    description:
      'Dated events for one hotel that explain changes in its numbers: rate changes, promotions, ' +
      'city events, staffing, maintenance, restaurant changes and market news, each with a title ' +
      'and detail. An event affects the days after its date, so look a few weeks before the ' +
      `period you are explaining. ${CONVENTIONS}`,
    schema: eventsInput,
    run: getEvents,
  }),
  defineTool({
    name: 'get_insights',
    description:
      'The most important findings for one hotel as of asOf, at most five, already analysed and ' +
      'ranked (rank 1 first). Each has a severity (critical, warning, positive or info), a ' +
      'plain-English headline with the number, the metric (glossary key) and its change in delta, ' +
      'the likely cause with the events behind it, a suggested next move, a chart, and the queries ' +
      `it ran as evidence. Start here when asked what needs attention. ${CONVENTIONS}`,
    schema: insightsInput,
    run: getInsights,
  }),
];

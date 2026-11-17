/*
 * Rules that turn the data into insights. Each detector looks at one window relative to the
 * dataset's "today", decides whether something is worth saying, and records every query it ran
 * as evidence. The wording lives in narratives.ts.
 */
import { z } from 'zod';
import { addDays, divide, sameTimeLastYear, type MetricKey } from './metrics';
import * as narrative from './narratives';
import {
  getAsOf,
  getBookingPace,
  getChannelPerformance,
  getEvents,
  getHotels,
  getKpis,
  getRestaurantPerformance,
  getStaffing,
  getTimeseries,
  hotelIdSchema,
  weekStart,
} from './queries';
import type {
  ChannelPerformance,
  Event,
  Hotel,
  HotelId,
  Insight,
  MetricValue,
  StaffingDay,
} from './types';
import { categoryWeight, ROLES } from './users';

export const insightsInput = z.object({
  hotelId: hotelIdSchema,
  role: z
    .enum(ROLES)
    .optional()
    .describe('Rank for this role: insights in the categories it cares about move up'),
});

const MAX_INSIGHTS = 5;
const SEVERITY_SCORE: Record<Insight['severity'], number> = {
  critical: 4,
  warning: 3,
  positive: 2,
  info: 1,
};

/** Thresholds, in the delta's unit. */
const PROFIT_CHANGE = 8; // percent
const PACE = { critical: 0.85, warning: 0.92, positive: 1.05 }; // ratio to last year
const CAPTURE_DROP = 5; // points
const NET_RATE_DROP = 10; // percent
const DIRECT_SHARE_CHANGE = 5; // points
const STAFFING_RISE = 10; // percent

/** An event shapes the days after it, so a period's events include those dated shortly before it. */
const EVENT_LEAD_DAYS = 30;

/** An insight before ranking, with the metrics its cause names so repeats can be spotted. */
type Finding = Omit<Insight, 'rank'> & { causeMetrics: MetricKey[] };
type LabelledPeriod = Insight['period'];
type Run = <Args, Rows>(query: string, fn: (args: Args) => Rows, args: Args) => Rows;

const AS_OF = getAsOf();

// ---------------------------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------------------------

/** Runs queries and keeps what was asked and what came back, under the tool's name. */
function recorder(): { evidence: Insight['evidence']; run: Run } {
  const evidence: Insight['evidence'] = [];
  return {
    evidence,
    run: (query, fn, args) => {
      const rows = fn(args);
      evidence.push({ query, args, rows });
      return rows;
    },
  };
}

/** The calendar month `offset` months away from the month of `date`. */
function calendarMonth(date: string, offset: number): LabelledPeriod {
  const year = Number(date.slice(0, 4));
  const month = Number(date.slice(5, 7)) - 1 + offset;
  const from = new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10);
  const to = new Date(Date.UTC(year, month + 1, 0)).toISOString().slice(0, 10);
  return { from, to, label: narrative.monthLabel(from) };
}

function lastFullMonth(): LabelledPeriod {
  const current = calendarMonth(AS_OF, 0);
  return current.to === AS_OF ? current : calendarMonth(AS_OF, -1);
}

const nextFullMonth = (): LabelledPeriod => calendarMonth(AS_OF, 1);

const lastDays = (days: number, label: string): LabelledPeriod => ({
  from: addDays(AS_OF, 1 - days),
  to: AS_OF,
  label,
});

function eventsNear(
  run: Run,
  hotelId: HotelId,
  period: { from: string; to: string },
  kinds: Event['kind'][],
  leadDays = EVENT_LEAD_DAYS,
): Event[] {
  const args = { hotelId, from: addDays(period.from, -leadDays), to: period.to };
  return run('get_events', getEvents, args).filter((event) => kinds.includes(event.kind));
}

const lastYearOf = (value: MetricValue): number => value.lastYear?.value ?? 0;
const changeOf = (value: MetricValue): number => value.lastYear?.delta ?? 0;
const percentChange = (now: number, before: number): number =>
  divide(now - before, Math.abs(before)) * 100;
const round1 = (value: number): number => Math.round(value * 10) / 10;
const sum = <Row>(rows: Row[], value: (row: Row) => number): number =>
  rows.reduce((total, row) => total + value(row), 0);
const bySize = (a: { euros: number }, b: { euros: number }): number =>
  Math.abs(b.euros) - Math.abs(a.euros);

const DEPARTMENTS: StaffingDay['department'][] = ['rooms', 'restaurant', 'front_desk'];
const DEPARTMENT_NAMES = { rooms: 'rooms', restaurant: 'restaurant', front_desk: 'front desk' };
const STAFFING_FACTORS = {
  rooms: 'roomsStaffing',
  restaurant: 'restaurantStaffing',
  front_desk: 'frontDeskStaffing',
} as const;

/** The glossary metrics a profit factor stands for, when the cause names it. */
const FACTOR_METRICS: Record<narrative.ProfitFactor, MetricKey[]> = {
  occupancy: ['occupancy'],
  rate: ['averageDailyRate'],
  roomsOutOfService: [],
  distribution: ['distributionCost'],
  restaurant: ['restaurantMargin'],
  roomsStaffing: ['staffingCost', 'staffingCostPerOccupiedRoom'],
  restaurantStaffing: ['staffingCost', 'staffingCostPerOccupiedRoom'],
  frontDeskStaffing: ['staffingCost', 'staffingCostPerOccupiedRoom'],
};

// ---------------------------------------------------------------------------------------------
// Detectors
// ---------------------------------------------------------------------------------------------

/** Last full month: operating profit moved 8% or more against last year. */
function profitVsLastYear(hotel: Hotel): Finding | undefined {
  const { evidence, run } = recorder();
  const period = lastFullMonth();
  const args = { hotelId: hotel.id, from: period.from, to: period.to };
  const kpis = run('get_kpis', getKpis, args);
  const profit = kpis.operatingProfit;
  if (!profit.lastYear || Math.abs(profit.lastYear.delta) < PROFIT_CHANGE) return undefined;
  const down = profit.lastYear.delta < 0;

  const staffing = run('get_staffing', getStaffing, args);
  const restaurant = run('get_restaurant_performance', getRestaurantPerformance, args);
  const revenue = run('get_timeseries', getTimeseries, {
    ...args,
    metric: 'totalRevenue' as const,
    grain: 'month' as const,
  });

  // What each factor added to or took from profit. Room revenue is rooms available × occupancy
  // × rate, so its change splits exactly into those three; costs count with their sign flipped.
  const rooms = { now: kpis.roomsAvailable.value, before: lastYearOf(kpis.roomsAvailable) };
  const sold = { now: kpis.roomsSold.value, before: lastYearOf(kpis.roomsSold) };
  const rate = { now: kpis.averageDailyRate.value, before: lastYearOf(kpis.averageDailyRate) };
  const occupancyBefore = divide(sold.before, rooms.before);
  const fees = {
    now: (kpis.revenuePerAvailableRoom.value - kpis.netRevenuePerAvailableRoom.value) * rooms.now,
    before:
      (lastYearOf(kpis.revenuePerAvailableRoom) - lastYearOf(kpis.netRevenuePerAvailableRoom)) *
      rooms.before,
  };
  const afterIngredients = {
    now: restaurant.revenue.value - restaurant.ingredientCost.value,
    before: lastYearOf(restaurant.revenue) - lastYearOf(restaurant.ingredientCost),
  };
  const drivers: narrative.ProfitDriver[] = [
    {
      factor: 'occupancy',
      euros: rooms.now * (divide(sold.now, rooms.now) - occupancyBefore) * rate.before,
      change: changeOf(kpis.occupancy),
    },
    {
      factor: 'rate',
      euros: sold.now * (rate.now - rate.before),
      change: changeOf(kpis.averageDailyRate),
    },
    {
      factor: 'roomsOutOfService',
      euros: (rooms.now - rooms.before) * occupancyBefore * rate.before,
      change: rooms.now - rooms.before,
    },
    {
      factor: 'distribution',
      euros: fees.before - fees.now,
      change: percentChange(fees.now, fees.before),
    },
    {
      factor: 'restaurant',
      euros: afterIngredients.now - afterIngredients.before,
      change: percentChange(afterIngredients.now, afterIngredients.before),
    },
    ...DEPARTMENTS.map((department) => {
      const { cost } = staffing.byDepartment[department];
      return {
        factor: STAFFING_FACTORS[department],
        euros: lastYearOf(cost) - cost.value,
        change: changeOf(cost),
      };
    }),
  ];

  // Name the two largest factors that moved profit the way it went, and the largest one that
  // pushed the other way if it is big enough to matter.
  const named = drivers
    .filter((driver) => driver.euros < 0 === down)
    .sort(bySize)
    .slice(0, 2);
  if (named.length === 0) return undefined;
  const [against] = drivers.filter((driver) => driver.euros < 0 !== down).sort(bySize);
  const offset =
    against && Math.abs(against.euros) >= 0.25 * Math.abs(named[0].euros) ? against : undefined;
  const events = eventsNear(run, hotel.id, period, ['rate_change', 'staffing', 'maintenance']);

  return {
    id: `${hotel.id}:profitVsLastYear`,
    hotelId: hotel.id,
    severity: down ? 'critical' : 'positive',
    category: 'profit',
    headline: narrative.profit.headline(
      period.label,
      profit.lastYear.delta,
      profit.value,
      profit.lastYear.value,
    ),
    metric: 'operatingProfit',
    period,
    delta: { value: profit.lastYear.delta, unit: profit.lastYear.deltaUnit },
    chart: {
      type: 'bar',
      title: 'Revenue and profit',
      unit: 'currency',
      x: ['Revenue', 'Profit'],
      series: [
        { name: 'Last year', role: 'lastYear', data: [revenue.lastYear[0], profit.lastYear.value] },
        { name: 'This year', role: 'current', data: [revenue.current[0], profit.value] },
      ],
    },
    cause: narrative.profit.cause(named, offset, events),
    causeEvents: events,
    nextMove: narrative.profit.nextMove(named[0].factor, down, events),
    evidence,
    causeMetrics: [...named, ...(offset ? [offset] : [])].flatMap(
      (driver) => FACTOR_METRICS[driver.factor],
    ),
  };
}

/** Next full month: rooms on the books against the same point last year. */
function bookingPaceVsLastYear(hotel: Hotel): Finding | undefined {
  const { evidence, run } = recorder();
  const period = nextFullMonth();
  const pace = run('get_booking_pace', getBookingPace, {
    hotelId: hotel.id,
    stayFrom: period.from,
    stayTo: period.to,
  });
  if (pace.roomsBookedSameTimeLastYear === 0) return undefined;
  const severity =
    pace.paceRatio <= PACE.critical
      ? 'critical'
      : pace.paceRatio <= PACE.warning
        ? 'warning'
        : pace.paceRatio >= PACE.positive
          ? 'positive'
          : undefined;
  if (!severity) return undefined;

  const behind = severity !== 'positive';
  const change = round1(percentChange(pace.roomsBookedNow, pace.roomsBookedSameTimeLastYear));
  const events = eventsNear(run, hotel.id, { from: AS_OF, to: AS_OF }, ['market']);
  const runningTotal = (rooms: number[]): number[] => {
    let total = 0;
    return rooms.map((booked) => (total += booked));
  };

  return {
    id: `${hotel.id}:bookingPace`,
    hotelId: hotel.id,
    severity,
    category: 'bookings',
    headline: narrative.pace.headline(
      period.label,
      change,
      pace.roomsBookedNow,
      pace.roomsBookedSameTimeLastYear,
    ),
    metric: 'bookingPace',
    period,
    delta: { value: change, unit: 'percent' },
    chart: {
      type: 'line',
      title: `${period.label.split(' ')[0]} rooms on the books`,
      unit: 'count',
      x: pace.byWeek.map((week) => week.weekStart),
      series: [
        {
          name: 'Same point last year',
          role: 'lastYear',
          data: runningTotal(pace.byWeek.map((week) => week.roomsBookedSameTimeLastYear)),
        },
        {
          name: 'Now',
          role: 'current',
          data: runningTotal(pace.byWeek.map((week) => week.roomsBookedNow)),
        },
      ],
    },
    cause: narrative.pace.cause(period.label, pace.pickup14, pace.lastYearPickup14, events),
    causeEvents: events,
    nextMove: narrative.pace.nextMove(
      period.label,
      behind,
      pace.pickup14 < 0.8 * pace.lastYearPickup14,
    ),
    evidence,
    causeMetrics: ['bookingPickup'],
  };
}

/** Last 12 weeks against the 12 before, Mondays to Thursdays: capture rate fell 5 points or more. */
function restaurantCapture(hotel: Hotel): Finding | undefined {
  const { evidence, run } = recorder();
  const recent = lastDays(84, 'last 12 weeks');
  const earlier = { from: addDays(recent.from, -84), to: addDays(recent.from, -1) };
  const now = run('get_restaurant_performance', getRestaurantPerformance, {
    hotelId: hotel.id,
    from: recent.from,
    to: recent.to,
  });
  const before = run('get_restaurant_performance', getRestaurantPerformance, {
    hotelId: hotel.id,
    ...earlier,
  });
  const capture = {
    now: now.split.monToThu.captureRate.value,
    before: before.split.monToThu.captureRate.value,
  };
  const change = round1(capture.now - capture.before);
  if (change > -CAPTURE_DROP) return undefined;

  const weekly = run('get_timeseries', getTimeseries, {
    hotelId: hotel.id,
    from: earlier.from,
    to: recent.to,
    metric: 'restaurantCaptureRate' as const,
    grain: 'week' as const,
    weekdays: 'monToThu' as const,
  });
  const events = eventsNear(
    run,
    hotel.id,
    { from: earlier.from, to: recent.to },
    ['restaurant'],
    0,
  );

  return {
    id: `${hotel.id}:restaurantCapture`,
    hotelId: hotel.id,
    severity: 'warning',
    category: 'restaurant',
    headline: narrative.restaurant.headline(now.restaurantName, capture.now, capture.before),
    metric: 'restaurantCaptureRate',
    period: recent,
    delta: { value: change, unit: 'points' },
    chart: {
      type: 'line',
      title: 'Monday–Thursday capture rate',
      unit: 'percent',
      x: weekly.x,
      series: [{ name: now.restaurantName, role: 'current', data: weekly.current }],
      markers: events.map((event) => ({ x: weekStart(event.date), label: event.title })),
    },
    cause: narrative.restaurant.cause(
      {
        revenuePerCover: { now: now.revenuePerCover.value, before: before.revenuePerCover.value },
        staffingChange: percentChange(now.staffingCost.value, before.staffingCost.value),
        margin: { now: now.margin.value, before: before.margin.value },
      },
      events,
    ),
    causeEvents: events,
    nextMove: narrative.restaurant.nextMove(events),
    evidence,
    causeMetrics: ['revenuePerCover', 'restaurantMargin'],
  };
}

/** Last 90 days: is the channel that brings the most revenue also the one that keeps the most? */
function channelNetRate(hotel: Hotel): Finding | undefined {
  const { evidence, run } = recorder();
  const period = lastDays(90, 'last 90 days');
  const args = { hotelId: hotel.id, from: period.from, to: period.to };
  const rows = run('get_channel_performance', getChannelPerformance, args);
  const top = rows.find((row) => row.grossRevenueRank === 1);
  const best = rows.find((row) => row.netRateRank === 1);
  if (!top || !best || top.roomsSold === 0) return undefined;
  const promotions = eventsNear(run, hotel.id, period, ['promotion'], 0);

  // Warn when the biggest channel is not the most profitable one, or when a channel keeps much
  // less per room night than last year while a promotion runs. Otherwise just name the best.
  let subject: ChannelPerformance = top;
  let severity: Insight['severity'] = 'warning';
  let change: number;
  let headline: string;
  if (top !== best) {
    change = round1(percentChange(top.netRate, best.netRate));
    headline = narrative.channels.mismatchHeadline(top, best, change);
  } else {
    const lastYear = promotions.length
      ? run('get_channel_performance', getChannelPerformance, {
          hotelId: hotel.id,
          ...sameTimeLastYear(period),
        })
      : [];
    const [worst] = rows
      .flatMap((row) => {
        const before = lastYear.find((other) => other.channelId === row.channelId);
        return before && before.roomsSold > 0
          ? [{ row, change: round1(percentChange(row.netRate, before.netRate)) }]
          : [];
      })
      .filter((drop) => drop.change <= -NET_RATE_DROP)
      .sort((a, b) => a.change - b.change);
    if (worst) {
      subject = worst.row;
      change = worst.change;
      headline = narrative.channels.promotionHeadline(worst.row, worst.change);
    } else {
      const runnerUp = rows.find((row) => row.netRateRank === 2);
      severity = 'info';
      change = runnerUp ? round1(percentChange(best.netRate, runnerUp.netRate)) : 0;
      headline = narrative.channels.bestHeadline(best);
    }
  }

  return {
    id: `${hotel.id}:channelNetRate`,
    hotelId: hotel.id,
    severity,
    category: 'channels',
    headline,
    metric: 'netRate',
    period,
    delta: { value: change, unit: 'percent' },
    chart: {
      type: 'bar',
      title: 'Kept per room night, by channel',
      unit: 'currency',
      x: ['Kept per room night'],
      series: rows.map((row) => ({
        name: row.name,
        role: 'entity' as const,
        entityId: row.channelId,
        data: [row.netRate],
      })),
    },
    cause: narrative.channels.cause(subject, rows.length, promotions),
    causeEvents: promotions,
    nextMove: narrative.channels.nextMove(top, best),
    evidence,
    causeMetrics: ['distributionCost'],
  };
}

/** Last 180 days against the same days last year: direct share moved 5 points or more. */
function directShareVsLastYear(hotel: Hotel): Finding | undefined {
  const { evidence, run } = recorder();
  const period = lastDays(180, 'last 180 days');
  const args = { hotelId: hotel.id, from: period.from, to: period.to };
  const summarise = (rows: ChannelPerformance[]) => {
    const fees = sum(rows, (row) => row.distributionCost);
    return {
      rooms: sum(rows, (row) => row.roomsSold),
      share: sum(
        rows.filter((row) => row.kind === 'direct'),
        (row) => row.shareOfRooms,
      ),
      fees,
      feeShare:
        divide(
          fees,
          sum(rows, (row) => row.grossRevenue),
        ) * 100,
    };
  };
  const now = summarise(run('get_channel_performance', getChannelPerformance, args));
  const before = summarise(
    run('get_channel_performance', getChannelPerformance, {
      hotelId: hotel.id,
      ...sameTimeLastYear(period),
    }),
  );
  if (before.rooms === 0) return undefined;
  const change = round1(now.share - before.share);
  if (Math.abs(change) < DIRECT_SHARE_CHANGE) return undefined;

  const monthly = run('get_timeseries', getTimeseries, {
    ...args,
    metric: 'directShare' as const,
    grain: 'month' as const,
  });
  const promotions = eventsNear(run, hotel.id, period, ['promotion']);

  return {
    id: `${hotel.id}:directShare`,
    hotelId: hotel.id,
    severity: change > 0 ? 'positive' : 'warning',
    category: 'channels',
    headline: narrative.directShare.headline(now.share, before.share),
    metric: 'directShare',
    period,
    delta: { value: change, unit: 'points' },
    chart: {
      type: 'line',
      title: 'Direct share of rooms',
      unit: 'percent',
      x: monthly.x,
      series: [
        { name: 'Last year', role: 'lastYear', data: monthly.lastYear },
        { name: 'This year', role: 'current', data: monthly.current },
      ],
    },
    cause: narrative.directShare.cause(
      { now: now.feeShare, before: before.feeShare },
      percentChange(now.fees, before.fees),
      promotions,
    ),
    causeEvents: promotions,
    nextMove: narrative.directShare.nextMove(change > 0),
    evidence,
    causeMetrics: ['distributionCost'],
  };
}

/** Last full month: staffing cost per occupied room is 10% or more above last year. */
function staffingCostPerRoom(hotel: Hotel): Finding | undefined {
  const { evidence, run } = recorder();
  const period = lastFullMonth();
  const staffing = run('get_staffing', getStaffing, {
    hotelId: hotel.id,
    from: period.from,
    to: period.to,
  });
  const perRoom = staffing.staffingCostPerOccupiedRoom;
  if (!perRoom.lastYear || perRoom.lastYear.delta < STAFFING_RISE) return undefined;

  const departments = DEPARTMENTS.map((department) => {
    const cost = staffing.byDepartment[department].costPerOccupiedRoom;
    return {
      name: DEPARTMENT_NAMES[department],
      now: cost.value,
      before: lastYearOf(cost),
      change: changeOf(cost),
    };
  });
  const [worst] = [...departments].sort((a, b) => b.now - b.before - (a.now - a.before));
  const events = eventsNear(run, hotel.id, period, ['staffing']);

  return {
    id: `${hotel.id}:staffingCostPerOccupiedRoom`,
    hotelId: hotel.id,
    severity: 'warning',
    category: 'staffing',
    headline: narrative.staffing.headline(
      period.label,
      perRoom.value,
      perRoom.lastYear.value,
      perRoom.lastYear.delta,
    ),
    metric: 'staffingCostPerOccupiedRoom',
    period,
    delta: { value: perRoom.lastYear.delta, unit: perRoom.lastYear.deltaUnit },
    chart: {
      type: 'bar',
      title: 'Staff cost per room sold, by department',
      unit: 'currency',
      x: ['Rooms', 'Restaurant', 'Front desk'],
      series: [
        { name: 'Last year', role: 'lastYear', data: departments.map((row) => row.before) },
        { name: 'This year', role: 'current', data: departments.map((row) => row.now) },
      ],
    },
    cause: narrative.staffing.cause(worst, events),
    causeEvents: events,
    nextMove: narrative.staffing.nextMove(worst),
    evidence,
    causeMetrics: ['staffingCost'],
  };
}

const detectors = [
  profitVsLastYear,
  bookingPaceVsLastYear,
  restaurantCapture,
  channelNetRate,
  directShareVsLastYear,
  staffingCostPerRoom,
];

// ---------------------------------------------------------------------------------------------
// Ranking
// ---------------------------------------------------------------------------------------------

/**
 * Severity first, then the size of the change: the second part stays below 1, so on its own it
 * only orders insights of the same severity.
 */
function score({ severity, delta }: Finding): number {
  const size = Math.abs(delta.value);
  return SEVERITY_SCORE[severity] + size / (size + 100);
}

/**
 * The hotel's insights, most important first, at most five. With a role, each score is
 * multiplied by how much that role cares about the insight's category before sorting.
 */
export function getInsights({ hotelId, role }: z.infer<typeof insightsInput>): Insight[] {
  const hotel = getHotels().find((candidate) => candidate.id === hotelId);
  if (!hotel) throw new Error(`Unknown hotel: ${hotelId}`);

  const weighted = (finding: Finding): number =>
    score(finding) * categoryWeight(role, finding.category);
  const findings = detectors
    .flatMap((detect) => detect(hotel) ?? [])
    .sort((a, b) => weighted(b) - weighted(a));

  // A finding about a metric that a more important cause already names tells the same story
  // twice: keep it, but as background at the end.
  const named = new Set<MetricKey>();
  const leading: Finding[] = [];
  const repeats: Finding[] = [];
  for (const finding of findings) {
    if (named.has(finding.metric)) repeats.push({ ...finding, severity: 'info' });
    else leading.push(finding);
    for (const metric of finding.causeMetrics) named.add(metric);
  }

  return [...leading, ...repeats]
    .slice(0, MAX_INSIGHTS)
    .map(({ causeMetrics: _causeMetrics, ...insight }, i) => ({ ...insight, rank: i + 1 }));
}

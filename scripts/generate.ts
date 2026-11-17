/**
 * Generates data/data.json for the Pulse prototype: two years of daily actuals for two hotels,
 * booking snapshots for the next 90 days, and the events that explain the planted stories.
 *
 * Deterministic: all randomness comes from mulberry32 seeded with 42, so every run writes the
 * same file. Run with `npm run generate`.
 */
import { statSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { adr, occupancy, revpar } from '../shared/metrics';
import type {
  BookingChannel,
  Dataset,
  Event,
  FutureBookingSnapshot,
  Hotel,
  RestaurantDay,
  RoomsByChannelDay,
  RoomsDay,
  StaffingDay,
} from '../shared/types';

// ---------------------------------------------------------------------------------------------
// Calendar and randomness
// ---------------------------------------------------------------------------------------------

const AS_OF = '2026-11-17';
const FIRST_DAY = '2024-11-18';
const ACTUAL_DAYS = 730;
const FUTURE_DAYS = 90;
/** Days back to the same weekday a year earlier. */
const YEAR = 364;
/** Snapshot dates as days before asOf, oldest first. */
const SNAPSHOT_AGES = [28, 14, 7, 0];
/** Day index (2026-05-19) at which the base rates apply. */
const BASE_DAY = 547;
/** Baseline growth per year around the base day. */
const RATE_GROWTH = 1.03;
const OCCUPANCY_GROWTH = 0.01;

const DAY_MS = 86_400_000;
const addDays = (date: string, days: number): string =>
  new Date(Date.parse(date) + days * DAY_MS).toISOString().slice(0, 10);
/** 0 = Sunday … 6 = Saturday */
const weekdayOf = (date: string): number => new Date(date).getUTCDay();
const within = (date: string, [from, to]: readonly [string, string]): boolean =>
  date >= from && date <= to;
const round2 = (value: number): number => Math.round(value * 100) / 100;

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const random = mulberry32(42);
/** A factor within ±amplitude of 1. */
const noise = (amplitude: number): number => 1 + amplitude * (2 * random() - 1);

/** Interpolates between mid-month values (January first), so seasons change gradually. */
function seasonal(byMonth: readonly number[], date: string): number {
  const [year, month, day] = date.split('-').map(Number);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const position = month - 1 + (day - 0.5) / daysInMonth - 0.5; // whole numbers fall mid-month
  const lower = Math.floor(position);
  const weight = position - lower;
  return byMonth[(lower + 12) % 12] * (1 - weight) + byMonth[(lower + 13) % 12] * weight;
}

// ---------------------------------------------------------------------------------------------
// Hotels and channels
// ---------------------------------------------------------------------------------------------

const CHANNEL_IDS = ['direct', 'booking-com', 'expedia', 'corporate', 'travel-agents'] as const;
type ChannelId = (typeof CHANNEL_IDS)[number];
type PerChannel = Record<ChannelId, number>;

const bookingChannels: BookingChannel[] = [
  { id: 'direct', name: 'Direct website', kind: 'direct', commissionPercent: 0, costPerBooking: 2 },
  { id: 'booking-com', name: 'Booking.com', kind: 'ota', commissionPercent: 18, costPerBooking: 0 },
  { id: 'expedia', name: 'Expedia', kind: 'ota', commissionPercent: 15, costPerBooking: 0 },
  {
    id: 'corporate',
    name: 'Corporate contracts',
    kind: 'corporate',
    commissionPercent: 0,
    costPerBooking: 0,
  },
  {
    id: 'travel-agents',
    name: 'Travel agents',
    kind: 'wholesale',
    commissionPercent: 10,
    costPerBooking: 0,
  },
];

interface Profile {
  hotel: Hotel;
  baseRate: number;
  /** Mid-month occupancy (January first) before weekday, growth and event effects. */
  occupancyByMonth: readonly number[];
  /** Mid-month published rate relative to the base rate. */
  rateByMonth: readonly number[];
  /** Occupancy points added per weekday, Sunday first. */
  occupancyByWeekday: readonly number[];
  shares: PerChannel;
  lengthOfStay: number;
  guestsPerRoom: number;
  revenuePerCover: number;
  /** Fraction of the final rooms already booked at a number of days before the stay. */
  bookingCurve: readonly (readonly [lead: number, fraction: number])[];
}

const CENTRAL = 'hotel-central';
const MARINA = 'marina-resort';

const profiles: Profile[] = [
  {
    hotel: {
      id: CENTRAL,
      name: 'Hotel Central Brussels',
      city: 'Brussels',
      type: 'city',
      rooms: 180,
      currency: 'EUR',
      otherOperatingCostsPerDay: 6500,
      restaurantName: 'Brasserie Central',
      restaurantSeats: 90,
    },
    baseRate: 165,
    // Peaks March–June and September–October; troughs January–February and late July–August.
    occupancyByMonth: [0.56, 0.6, 0.74, 0.78, 0.8, 0.78, 0.66, 0.56, 0.82, 0.93, 0.72, 0.6],
    rateByMonth: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    occupancyByWeekday: [-0.1, 0, 0.12, 0.12, 0.12, 0, -0.1],
    shares: {
      direct: 0.28,
      'booking-com': 0.3,
      expedia: 0.12,
      corporate: 0.22,
      'travel-agents': 0.08,
    },
    lengthOfStay: 1.8,
    guestsPerRoom: 1.6,
    revenuePerCover: 38,
    bookingCurve: [
      [0, 1],
      [7, 0.85],
      [14, 0.72],
      [28, 0.55],
      [60, 0.35],
      [90, 0.22],
    ],
  },
  {
    hotel: {
      id: MARINA,
      name: 'Marina Resort Algarve',
      city: 'Vilamoura',
      type: 'resort',
      rooms: 240,
      currency: 'EUR',
      otherOperatingCostsPerDay: 9000,
      restaurantName: 'Mar Azul',
      restaurantSeats: 160,
    },
    baseRate: 210,
    // Peak June–September (about 90% with the weekend lift), trough November–February (about 45%).
    occupancyByMonth: [0.41, 0.43, 0.54, 0.66, 0.78, 0.87, 0.9, 0.9, 0.86, 0.68, 0.44, 0.41],
    rateByMonth: [0.86, 0.86, 0.9, 0.96, 1.04, 1.16, 1.27, 1.3, 1.18, 0.98, 0.87, 0.88],
    occupancyByWeekday: [0, 0, 0, 0, 0, 0.08, 0.08],
    shares: {
      direct: 0.22,
      'booking-com': 0.35,
      expedia: 0.15,
      corporate: 0.03,
      'travel-agents': 0.25,
    },
    lengthOfStay: 4.2,
    guestsPerRoom: 2.1,
    revenuePerCover: 46,
    bookingCurve: [
      [0, 0.98],
      [7, 0.95],
      [14, 0.9],
      [28, 0.8],
      [60, 0.6],
      [90, 0.45],
    ],
  },
];

/** Share of the published rate each channel pays. Corporate is the share of the base rate. */
const RATE_PAID: PerChannel = {
  direct: 0.97,
  'booking-com': 1,
  expedia: 1,
  corporate: 0.8,
  'travel-agents': 0.72,
};

// ---------------------------------------------------------------------------------------------
// Planted stories. Each window below has an event in `events` that explains it.
// ---------------------------------------------------------------------------------------------

type Period = readonly [from: string, to: string];

/** One per hotel in both years, 364 days apart: occupancy +15 pts on these days. */
const CITY_EVENT_POINTS = 0.15;
const MOTOR_SHOW: Period[] = [
  ['2025-01-10', '2025-01-19'],
  ['2026-01-09', '2026-01-18'],
];
const REGATTA: Period[] = [
  ['2025-09-25', '2025-09-28'],
  ['2026-09-24', '2026-09-27'],
];

/** Story 1 — pace, December 2026 stays (see buildSnapshots). */
const DECEMBER_2026: Period = ['2026-12-01', '2026-12-31'];
const CENTRAL_DECEMBER_VS_LAST_YEAR = 0.88;
const CENTRAL_DECEMBER_PICKUP_VS_LAST_YEAR = 0.6;
const MARINA_DECEMBER_VS_LAST_YEAR = 1.06;

/** Story 2 — Brasserie Central's Monday–Thursday capture rate drops with the set menu. */
const SET_MENU_FROM = '2026-09-01';
const CENTRAL_CAPTURE = { monToThu: 0.34, monToThuSetMenu: 0.26, friToSun: 0.28 };
const CENTRAL_WALK_INS = 20; // per day, Monday–Friday
const MARINA_CAPTURE = 0.55;

/** Story 3 — Booking.com Genius at the resort: more share at a discounted rate. */
const GENIUS: Period = ['2026-10-01', '2026-10-31'];
const GENIUS_SHARE = 0.45;
const GENIUS_RATE = 0.85;

/**
 * Story 4 — Hotel Central, October 2026. The published rate goes up 15%. Corporate and
 * travel-agent rates are contracted, so those channels keep (and slightly grow) their volume
 * while demand at public rates falls; the shares below are the resulting mix.
 */
const OCTOBER_2026: Period = ['2026-10-01', '2026-10-31'];
const OCTOBER_RATE_INCREASE = 1.15;
const OCTOBER_DEMAND_DROP = 0.105;
const OCTOBER_SHARES: PerChannel = {
  direct: 0.26,
  'booking-com': 0.278,
  expedia: 0.111,
  corporate: 0.258,
  'travel-agents': 0.093,
};
const AGENCY_COVER: Period = ['2026-10-06', '2026-10-24'];
const AGENCY_COVER_COST = 1.4;
const ROOMS_OUT_OF_SERVICE: Period = ['2026-10-08', '2026-10-17'];
const ROOMS_OUT_OF_SERVICE_COUNT = 6;

/** Story 5 — the resort's book-direct offer: rate +7% on last year instead of +3%. */
const BOOK_DIRECT: Period = ['2026-05-01', '2026-08-31'];
const BOOK_DIRECT_RATE = 1.07 / RATE_GROWTH;
const BOOK_DIRECT_SHARES: PerChannel = {
  direct: 0.3,
  'booking-com': 0.3,
  expedia: 0.15,
  corporate: 0.03,
  'travel-agents': 0.22,
};

const events: Event[] = [
  {
    hotelId: CENTRAL,
    date: '2025-01-10',
    kind: 'city_event',
    title: 'Brussels Motor Show',
    detail: 'Brussels Expo, 10–19 January 2025.',
  },
  {
    hotelId: CENTRAL,
    date: '2026-01-09',
    kind: 'city_event',
    title: 'Brussels Motor Show',
    detail: 'Brussels Expo, 9–18 January 2026.',
  },
  {
    hotelId: CENTRAL,
    date: SET_MENU_FROM,
    kind: 'restaurant',
    title: 'Dinner switched from à la carte to set menu',
    detail: 'Brasserie Central serves a fixed three-course dinner menu from 1 September 2026.',
  },
  {
    hotelId: CENTRAL,
    date: '2026-09-28',
    kind: 'rate_change',
    title: 'Published rate +15% for October (trade-fair season)',
    detail:
      'Applies to stays from 1 to 31 October 2026. Corporate and travel-agent contract rates are unchanged.',
  },
  {
    hotelId: CENTRAL,
    date: '2026-10-06',
    kind: 'staffing',
    title: 'Housekeeping: 4 staff on sick leave, agency cover until 24 Oct',
    detail:
      'Agency housekeepers cover 6–24 October 2026 at a premium. 6 rooms are out of service from 8 to 17 October.',
  },
  {
    hotelId: CENTRAL,
    date: '2026-11-03',
    kind: 'market',
    title: 'Two corporate accounts cut Q4 travel budgets',
    detail:
      'Both accounts have paused non-essential travel to Brussels until the end of December 2026.',
  },
  {
    hotelId: MARINA,
    date: '2025-09-25',
    kind: 'city_event',
    title: 'Algarve Regatta',
    detail: 'Vilamoura marina, 25–28 September 2025.',
  },
  {
    hotelId: MARINA,
    date: '2026-05-01',
    kind: 'promotion',
    title: 'Book direct, free breakfast (May–Aug)',
    detail:
      'Breakfast included for bookings made on the hotel website, stays from 1 May to 31 August 2026.',
  },
  {
    hotelId: MARINA,
    date: '2026-09-24',
    kind: 'city_event',
    title: 'Algarve Regatta',
    detail: 'Vilamoura marina, 24–27 September 2026.',
  },
  {
    hotelId: MARINA,
    date: '2026-10-01',
    kind: 'promotion',
    title: 'Booking.com Genius −15%, 1–31 Oct',
    detail:
      'Genius members get 15% off the published rate on Booking.com for stays in October 2026.',
  },
];

// ---------------------------------------------------------------------------------------------
// Daily actuals
// ---------------------------------------------------------------------------------------------

function occupancyEffect(hotelId: string, date: string): number {
  const cityEvent = hotelId === CENTRAL ? MOTOR_SHOW : REGATTA;
  let points = cityEvent.some((period) => within(date, period)) ? CITY_EVENT_POINTS : 0;
  if (hotelId === CENTRAL && within(date, OCTOBER_2026)) points -= OCTOBER_DEMAND_DROP;
  return points;
}

function channelShares(profile: Profile, date: string): PerChannel {
  const { id } = profile.hotel;
  if (id === CENTRAL && within(date, OCTOBER_2026)) return OCTOBER_SHARES;
  if (id === MARINA && within(date, BOOK_DIRECT)) return BOOK_DIRECT_SHARES;
  if (id === MARINA && within(date, GENIUS)) {
    // Booking.com grows to 45%; the other channels shrink in proportion.
    const others = (1 - GENIUS_SHARE) / (1 - profile.shares['booking-com']);
    const shares = { ...profile.shares };
    for (const channel of CHANNEL_IDS) shares[channel] *= others;
    shares['booking-com'] = GENIUS_SHARE;
    return shares;
  }
  return profile.shares;
}

function captureRate(hotel: Hotel, date: string, weekday: number): number {
  if (hotel.type === 'resort') return MARINA_CAPTURE;
  if (weekday < 1 || weekday > 4) return CENTRAL_CAPTURE.friToSun;
  return date >= SET_MENU_FROM ? CENTRAL_CAPTURE.monToThuSetMenu : CENTRAL_CAPTURE.monToThu;
}

interface Actuals {
  roomsDays: RoomsDay[];
  roomsByChannelDays: RoomsByChannelDay[];
  restaurantDays: RestaurantDay[];
  staffingDays: StaffingDay[];
}

function buildActuals(profile: Profile): Actuals {
  const { hotel } = profile;
  const actuals: Actuals = {
    roomsDays: [],
    roomsByChannelDays: [],
    restaurantDays: [],
    staffingDays: [],
  };

  for (let index = 0; index < ACTUAL_DAYS; index++) {
    const date = addDays(FIRST_DAY, index);
    const weekday = weekdayOf(date);
    const years = (index - BASE_DAY) / YEAR;
    const key = { hotelId: hotel.id, date };

    // Rooms sold
    const outOfService =
      hotel.id === CENTRAL && within(date, ROOMS_OUT_OF_SERVICE) ? ROOMS_OUT_OF_SERVICE_COUNT : 0;
    const roomsAvailable = hotel.rooms - outOfService;
    const expectedOccupancy =
      seasonal(profile.occupancyByMonth, date) +
      profile.occupancyByWeekday[weekday] +
      OCCUPANCY_GROWTH * years +
      occupancyEffect(hotel.id, date);
    const roomsSold = Math.min(
      Math.max(Math.round(expectedOccupancy * noise(0.04) * hotel.rooms), 0),
      roomsAvailable,
    );

    // Rates. Direct and the OTAs follow the published rate. Travel agents pay a share of the
    // rate the season was planned at, and corporate accounts a share of the base rate, so
    // neither moves with daily pricing or the October increase.
    const growth = RATE_GROWTH ** years;
    const bookDirect = hotel.id === MARINA && within(date, BOOK_DIRECT);
    const seasonRate =
      profile.baseRate *
      seasonal(profile.rateByMonth, date) *
      growth *
      (bookDirect ? BOOK_DIRECT_RATE : 1);
    const increase = hotel.id === CENTRAL && within(date, OCTOBER_2026) ? OCTOBER_RATE_INCREASE : 1;
    const publishedRate = round2(seasonRate * noise(0.03) * increase);
    const genius = hotel.id === MARINA && within(date, GENIUS) ? GENIUS_RATE : 1;
    const rates: PerChannel = {
      direct: RATE_PAID.direct * publishedRate,
      'booking-com': RATE_PAID['booking-com'] * publishedRate * genius,
      expedia: RATE_PAID.expedia * publishedRate,
      corporate: RATE_PAID.corporate * profile.baseRate * growth,
      'travel-agents': RATE_PAID['travel-agents'] * seasonRate,
    };

    // Channel split; the direct row takes what rounding leaves over.
    const shares = channelShares(profile, date);
    const rooms = { direct: roomsSold } as PerChannel;
    for (const channel of CHANNEL_IDS) {
      if (channel === 'direct') continue;
      rooms[channel] = Math.round(shares[channel] * roomsSold);
      rooms.direct -= rooms[channel];
    }
    let roomRevenue = 0;
    for (const channelId of CHANNEL_IDS) {
      const revenue = round2(rooms[channelId] * rates[channelId]);
      roomRevenue += revenue;
      actuals.roomsByChannelDays.push({
        ...key,
        channelId,
        roomsSold: rooms[channelId],
        roomRevenue: revenue,
        bookings: Math.round(rooms[channelId] / profile.lengthOfStay),
      });
    }

    const guestsInHouse = Math.round(roomsSold * profile.guestsPerRoom);
    actuals.roomsDays.push({
      ...key,
      roomsAvailable,
      roomsSold,
      roomRevenue: round2(roomRevenue),
      publishedRate,
      guestsInHouse,
    });

    // Restaurant
    const walkIns = hotel.type === 'city' && weekday >= 1 && weekday <= 5 ? CENTRAL_WALK_INS : 0;
    const covers = Math.round(guestsInHouse * captureRate(hotel, date, weekday) + walkIns);
    const restaurantRevenue = round2(covers * profile.revenuePerCover);
    actuals.restaurantDays.push({
      ...key,
      covers,
      revenue: restaurantRevenue,
      ingredientCost: round2(restaurantRevenue * 0.32),
    });

    // Staffing
    const agency = hotel.id === CENTRAL && within(date, AGENCY_COVER) ? AGENCY_COVER_COST : 1;
    actuals.staffingDays.push(
      { ...key, department: 'rooms', cost: round2((800 + 22 * roomsSold) * agency * noise(0.05)) },
      { ...key, department: 'restaurant', cost: round2((1100 + 4 * covers) * noise(0.05)) },
      { ...key, department: 'front_desk', cost: round2((900 + 2 * roomsSold) * noise(0.05)) },
    );
  }

  return actuals;
}

// ---------------------------------------------------------------------------------------------
// Booking snapshots
// ---------------------------------------------------------------------------------------------

/** Fraction of the final rooms booked `lead` days before the stay; the last segment extends. */
function fractionBooked(curve: Profile['bookingCurve'], lead: number): number {
  let segment = 1;
  while (segment < curve.length - 1 && lead > curve[segment][0]) segment++;
  const [fromLead, fromFraction] = curve[segment - 1];
  const [toLead, toFraction] = curve[segment];
  const slope = (toFraction - fromFraction) / (toLead - fromLead);
  return Math.max(fromFraction + slope * (lead - fromLead), 0);
}

/**
 * For each stay date in the next 90 days: four snapshots this year, and the same four for the
 * stay date 364 days earlier (already in the actuals, so they build up to what was really sold).
 * This year's expected final is last year's rooms sold plus the baseline occupancy growth.
 */
function buildSnapshots(profile: Profile, roomsDays: RoomsDay[]): FutureBookingSnapshot[] {
  const { hotel } = profile;
  const actual = new Map(roomsDays.map((day) => [day.date, day]));
  const lastYear: FutureBookingSnapshot[] = [];
  const thisYear: FutureBookingSnapshot[] = [];

  for (let ahead = 1; ahead <= FUTURE_DAYS; ahead++) {
    const stayDate = addDays(AS_OF, ahead);
    const before = actual.get(addDays(stayDate, -YEAR));
    if (!before) throw new Error(`No actuals 364 days before ${stayDate}`);
    const curve = SNAPSHOT_AGES.map((age) => fractionBooked(profile.bookingCurve, ahead + age));

    const bookedBefore = curve.map((fraction) => Math.round(before.roomsSold * fraction));
    const expectedFinal = Math.min(
      before.roomsSold + Math.round(OCCUPANCY_GROWTH * hotel.rooms),
      hotel.rooms,
    );
    let booked = curve.map((fraction) => Math.round(expectedFinal * fraction));

    if (within(stayDate, DECEMBER_2026)) {
      if (hotel.id === CENTRAL) {
        // Story 1: 12% behind last year today, after two weeks of picking up 60% of what
        // last year picked up. Before the corporate cuts, pickup matched last year's.
        const [before28, before14, before7, beforeNow] = bookedBefore;
        const now = Math.round(CENTRAL_DECEMBER_VS_LAST_YEAR * beforeNow);
        const pickup = (since: number): number =>
          Math.round(CENTRAL_DECEMBER_PICKUP_VS_LAST_YEAR * (beforeNow - since));
        const twoWeeksAgo = now - pickup(before14);
        booked = [twoWeeksAgo - (before14 - before28), twoWeeksAgo, now - pickup(before7), now];
      } else {
        booked = bookedBefore.map((rooms) => Math.round(MARINA_DECEMBER_VS_LAST_YEAR * rooms));
      }
    }

    const rateBefore = before.roomRevenue / before.roomsSold;
    SNAPSHOT_AGES.forEach((age, i) => {
      lastYear.push({
        hotelId: hotel.id,
        stayDate: before.date,
        snapshotDate: addDays(AS_OF, -YEAR - age),
        roomsBooked: bookedBefore[i],
        revenueBooked: round2(bookedBefore[i] * rateBefore),
      });
      thisYear.push({
        hotelId: hotel.id,
        stayDate,
        snapshotDate: addDays(AS_OF, -age),
        roomsBooked: booked[i],
        revenueBooked: round2(booked[i] * rateBefore * RATE_GROWTH),
      });
    });
  }

  return [...lastYear, ...thisYear];
}

function buildDataset(): Dataset {
  const dataset: Dataset = {
    asOf: AS_OF,
    hotels: profiles.map((profile) => profile.hotel),
    bookingChannels,
    roomsDays: [],
    roomsByChannelDays: [],
    restaurantDays: [],
    staffingDays: [],
    futureBookingSnapshots: [],
    events,
  };
  for (const profile of profiles) {
    const actuals = buildActuals(profile);
    dataset.roomsDays.push(...actuals.roomsDays);
    dataset.roomsByChannelDays.push(...actuals.roomsByChannelDays);
    dataset.restaurantDays.push(...actuals.restaurantDays);
    dataset.staffingDays.push(...actuals.staffingDays);
    dataset.futureBookingSnapshots.push(...buildSnapshots(profile, actuals.roomsDays));
  }
  return dataset;
}

// ---------------------------------------------------------------------------------------------
// Invariants
// ---------------------------------------------------------------------------------------------

function assertInvariants(data: Dataset): void {
  const check = (condition: boolean, message: string): void => {
    if (!condition) throw new Error(`Invariant failed: ${message}`);
  };
  const assertUnique = (table: string, keys: string[]): void => {
    check(new Set(keys).size === keys.length, `duplicate keys in ${table}`);
  };
  const hotelRooms = new Map(data.hotels.map((hotel) => [hotel.id, hotel.rooms]));
  const roomsDay = new Map(data.roomsDays.map((day) => [`${day.hotelId}|${day.date}`, day]));

  for (const day of data.roomsDays) {
    const at = `${day.hotelId} ${day.date}`;
    check(day.roomsSold <= day.roomsAvailable, `roomsSold > roomsAvailable at ${at}`);
    check(day.roomsAvailable <= hotelRooms.get(day.hotelId)!, `roomsAvailable > rooms at ${at}`);
  }

  const channelTotals = new Map<string, { rooms: number; revenue: number }>();
  for (const row of data.roomsByChannelDays) {
    const key = `${row.hotelId}|${row.date}`;
    const total = channelTotals.get(key) ?? { rooms: 0, revenue: 0 };
    total.rooms += row.roomsSold;
    total.revenue += row.roomRevenue;
    channelTotals.set(key, total);
    check(row.roomsSold >= 0, `negative channel roomsSold at ${key} ${row.channelId}`);
  }
  for (const [key, day] of roomsDay) {
    const total = channelTotals.get(key);
    check(total?.rooms === day.roomsSold, `channel roomsSold do not add up at ${key}`);
    check(
      Math.abs((total?.revenue ?? 0) - day.roomRevenue) < 0.005,
      `channel roomRevenue does not add up at ${key}`,
    );
  }

  for (const day of data.restaurantDays) {
    const at = `${day.hotelId} ${day.date}`;
    check(day.covers >= 0, `negative covers at ${at}`);
    check(day.ingredientCost < day.revenue, `ingredientCost >= revenue at ${at}`);
  }

  const snapshotsByStay = new Map<string, FutureBookingSnapshot[]>();
  for (const snapshot of data.futureBookingSnapshots) {
    const key = `${snapshot.hotelId}|${snapshot.stayDate}`;
    snapshotsByStay.set(key, [...(snapshotsByStay.get(key) ?? []), snapshot]);
  }
  for (const [key, snapshots] of snapshotsByStay) {
    const day = roomsDay.get(key); // present only for stay dates in the past
    const roomsAvailable = day?.roomsAvailable ?? hotelRooms.get(snapshots[0].hotelId)!;
    snapshots.sort((a, b) => a.snapshotDate.localeCompare(b.snapshotDate));
    snapshots.forEach((snapshot, i) => {
      const at = `${key} as of ${snapshot.snapshotDate}`;
      check(snapshot.roomsBooked >= 0, `negative roomsBooked at ${at}`);
      check(snapshot.roomsBooked <= roomsAvailable, `roomsBooked > roomsAvailable at ${at}`);
      check(!day || snapshot.roomsBooked <= day.roomsSold, `roomsBooked > rooms sold at ${at}`);
      check(
        i === 0 || snapshot.roomsBooked >= snapshots[i - 1].roomsBooked,
        `roomsBooked fell at ${at}`,
      );
    });
  }

  assertUnique(
    'roomsDays',
    data.roomsDays.map((row) => `${row.hotelId}|${row.date}`),
  );
  assertUnique(
    'roomsByChannelDays',
    data.roomsByChannelDays.map((row) => `${row.hotelId}|${row.date}|${row.channelId}`),
  );
  assertUnique(
    'restaurantDays',
    data.restaurantDays.map((row) => `${row.hotelId}|${row.date}`),
  );
  assertUnique(
    'staffingDays',
    data.staffingDays.map((row) => `${row.hotelId}|${row.date}|${row.department}`),
  );
  assertUnique(
    'futureBookingSnapshots',
    data.futureBookingSnapshots.map((row) => `${row.hotelId}|${row.stayDate}|${row.snapshotDate}`),
  );
}

// ---------------------------------------------------------------------------------------------
// Verification table, computed from the dataset that was written
// ---------------------------------------------------------------------------------------------

const sum = <T>(rows: T[], value: (row: T) => number): number =>
  rows.reduce((total, row) => total + value(row), 0);
const euros = (value: number): string => Math.round(value).toLocaleString('en-US');
const percent = (value: number, digits = 1): string => `${(value * 100).toFixed(digits)}%`;
const signed = (value: number, digits = 1): string =>
  `${value >= 0 ? '+' : ''}${value.toFixed(digits)}`;
const change = (now: number, before: number): string => `${signed((now / before - 1) * 100)}%`;
const points = (now: number, before: number): string => `${signed((now - before) * 100)} pts`;

function printTable(title: string, header: string[], rows: string[][]): void {
  const widths = header.map((_, column) =>
    Math.max(...[header, ...rows].map((row) => row[column].length)),
  );
  const line = (row: string[]): string =>
    row.map((cell, i) => (i === 0 ? cell.padEnd(widths[i]) : cell.padStart(widths[i]))).join('  ');
  console.log(`\n${title}`);
  console.log(line(header));
  console.log(widths.map((width) => '-'.repeat(width)).join('  '));
  for (const row of rows) console.log(line(row));
}

function summarise(data: Dataset, hotelId: string, period: Period) {
  const hotel = data.hotels.find((candidate) => candidate.id === hotelId)!;
  const channel = new Map(data.bookingChannels.map((candidate) => [candidate.id, candidate]));
  const inPeriod = <T extends { hotelId: string; date: string }>(rows: T[]): T[] =>
    rows.filter((row) => row.hotelId === hotelId && within(row.date, period));

  const rooms = inPeriod(data.roomsDays);
  const channels = inPeriod(data.roomsByChannelDays);
  const restaurant = inPeriod(data.restaurantDays);
  const staffing = inPeriod(data.staffingDays);

  const roomsAvailable = sum(rooms, (row) => row.roomsAvailable);
  const roomsSold = sum(rooms, (row) => row.roomsSold);
  const roomRevenue = sum(rooms, (row) => row.roomRevenue);
  const distributionCost = sum(channels, (row) => {
    const { commissionPercent, costPerBooking } = channel.get(row.channelId)!;
    return (row.roomRevenue * commissionPercent) / 100 + row.bookings * costPerBooking;
  });
  const operatingProfit =
    roomRevenue +
    sum(restaurant, (row) => row.revenue - row.ingredientCost) -
    distributionCost -
    sum(staffing, (row) => row.cost) -
    rooms.length * hotel.otherOperatingCostsPerDay;

  return {
    channels,
    occupancy: occupancy(roomsSold, roomsAvailable),
    adr: adr(roomRevenue, roomsSold),
    roomRevenue,
    roomsStaffing: sum(
      staffing.filter((row) => row.department === 'rooms'),
      (row) => row.cost,
    ),
    distributionCost,
    netRevpar: revpar(roomRevenue - distributionCost, roomsAvailable),
    directShare:
      sum(
        channels.filter((row) => row.channelId === 'direct'),
        (row) => row.roomsSold,
      ) / roomsSold,
    operatingProfit,
  };
}

function printVerification(data: Dataset, fileBytes: number): void {
  // Story 4
  const october = summarise(data, CENTRAL, OCTOBER_2026);
  const octoberBefore = summarise(data, CENTRAL, ['2025-10-01', '2025-10-31']);
  printTable(
    'Hotel Central — October 2026 vs October 2025',
    ['', 'Oct 2025', 'Oct 2026', 'Change'],
    [
      [
        'Occupancy',
        percent(octoberBefore.occupancy),
        percent(october.occupancy),
        points(october.occupancy, octoberBefore.occupancy),
      ],
      [
        'Average daily rate',
        octoberBefore.adr.toFixed(2),
        october.adr.toFixed(2),
        change(october.adr, octoberBefore.adr),
      ],
      [
        'Room revenue',
        euros(octoberBefore.roomRevenue),
        euros(october.roomRevenue),
        change(october.roomRevenue, octoberBefore.roomRevenue),
      ],
      [
        'Rooms staffing cost',
        euros(octoberBefore.roomsStaffing),
        euros(october.roomsStaffing),
        change(october.roomsStaffing, octoberBefore.roomsStaffing),
      ],
      [
        'Operating profit',
        euros(octoberBefore.operatingProfit),
        euros(october.operatingProfit),
        change(october.operatingProfit, octoberBefore.operatingProfit),
      ],
    ],
  );

  // Story 1
  const booked = (hotelId: string, year: 0 | 1, age: number): number =>
    sum(
      data.futureBookingSnapshots.filter(
        (row) =>
          row.hotelId === hotelId &&
          within(addDays(row.stayDate, year * YEAR), DECEMBER_2026) &&
          row.snapshotDate === addDays(AS_OF, -age - year * YEAR),
      ),
      (row) => row.roomsBooked,
    );
  const paceRows = data.hotels.flatMap((hotel) => {
    const [now, before] = [booked(hotel.id, 0, 0), booked(hotel.id, 1, 0)];
    const [pickup, pickupBefore] = [
      now - booked(hotel.id, 0, 14),
      before - booked(hotel.id, 1, 14),
    ];
    return [
      [`${hotel.name}: rooms booked`, `${before}`, `${now}`, percent(now / before)],
      [
        `${hotel.name}: 14-day pickup`,
        `${pickupBefore}`,
        `${pickup}`,
        percent(pickup / pickupBefore),
      ],
    ];
  });
  printTable(
    `Pace — December 2026 stays as of ${AS_OF} vs the same time last year (364 days earlier)`,
    ['', 'Last year', 'This year', 'vs last year'],
    paceRows,
  );

  // Story 2
  const capture = (period: Period): string[] => {
    const days = data.restaurantDays.filter((row) => {
      const weekday = weekdayOf(row.date);
      return row.hotelId === CENTRAL && within(row.date, period) && weekday >= 1 && weekday <= 4;
    });
    const guests = sum(
      data.roomsDays.filter(
        (row) => days.some((day) => day.date === row.date) && row.hotelId === CENTRAL,
      ),
      (row) => row.guestsInHouse,
    );
    const covers = sum(days, (row) => row.covers);
    return [percent((covers - CENTRAL_WALK_INS * days.length) / guests), percent(covers / guests)];
  };
  const [summer, autumn] = [capture(['2026-06-01', '2026-08-31']), capture(['2026-09-01', AS_OF])];
  printTable(
    'Brasserie Central — Monday–Thursday capture rate (covers ÷ guests in house)',
    ['', 'Jun–Aug 2026', 'Sep–Nov 2026'],
    [
      [`Hotel guests (without ${CENTRAL_WALK_INS} walk-ins a day)`, summer[0], autumn[0]],
      ['All covers', summer[1], autumn[1]],
    ],
  );

  // Story 3
  const last90: Period = [addDays(AS_OF, -89), AS_OF];
  const channelRows = data.bookingChannels.map((channel) => {
    const rows = summarise(data, MARINA, last90).channels.filter(
      (row) => row.channelId === channel.id,
    );
    const gross = sum(rows, (row) => row.roomRevenue);
    const net =
      gross * (1 - channel.commissionPercent / 100) -
      sum(rows, (row) => row.bookings) * channel.costPerBooking;
    return { name: channel.name, gross, netRate: net / sum(rows, (row) => row.roomsSold) };
  });
  const rank = (values: number[], value: number): string =>
    `${values.filter((other) => other > value).length + 1}`;
  printTable(
    `Marina Resort — channels, last 90 days (${last90[0]} to ${last90[1]})`,
    ['', 'Gross revenue', 'Rank', 'Net rate', 'Rank'],
    channelRows.map((row) => [
      row.name,
      euros(row.gross),
      rank(
        channelRows.map((other) => other.gross),
        row.gross,
      ),
      row.netRate.toFixed(2),
      rank(
        channelRows.map((other) => other.netRate),
        row.netRate,
      ),
    ]),
  );

  // Story 5
  const season = summarise(data, MARINA, BOOK_DIRECT);
  const seasonBefore = summarise(data, MARINA, ['2025-05-01', '2025-08-31']);
  printTable(
    'Marina Resort — May–August 2026 vs May–August 2025',
    ['', '2025', '2026', 'Change'],
    [
      [
        'Direct share of rooms sold',
        percent(seasonBefore.directShare),
        percent(season.directShare),
        points(season.directShare, seasonBefore.directShare),
      ],
      [
        'Distribution cost',
        euros(seasonBefore.distributionCost),
        euros(season.distributionCost),
        change(season.distributionCost, seasonBefore.distributionCost),
      ],
      [
        'Distribution cost, share of room revenue',
        percent(seasonBefore.distributionCost / seasonBefore.roomRevenue),
        percent(season.distributionCost / season.roomRevenue),
        points(
          season.distributionCost / season.roomRevenue,
          seasonBefore.distributionCost / seasonBefore.roomRevenue,
        ),
      ],
      [
        'Net revenue per available room',
        seasonBefore.netRevpar.toFixed(2),
        season.netRevpar.toFixed(2),
        change(season.netRevpar, seasonBefore.netRevpar),
      ],
      [
        'Occupancy',
        percent(seasonBefore.occupancy),
        percent(season.occupancy),
        points(season.occupancy, seasonBefore.occupancy),
      ],
    ],
  );

  printTable(
    `data/data.json — ${(fileBytes / 1024).toFixed(0)} KB`,
    ['Table', 'Rows'],
    [
      ['hotels', data.hotels.length],
      ['bookingChannels', data.bookingChannels.length],
      ['roomsDays', data.roomsDays.length],
      ['roomsByChannelDays', data.roomsByChannelDays.length],
      ['restaurantDays', data.restaurantDays.length],
      ['staffingDays', data.staffingDays.length],
      ['futureBookingSnapshots', data.futureBookingSnapshots.length],
      ['events', data.events.length],
    ].map(([table, rows]) => [`${table}`, `${rows}`]),
  );
}

// ---------------------------------------------------------------------------------------------

const dataset = buildDataset();
assertInvariants(dataset);
const file = fileURLToPath(new URL('../data/data.json', import.meta.url));
writeFileSync(file, JSON.stringify(dataset));
printVerification(dataset, statSync(file).size);

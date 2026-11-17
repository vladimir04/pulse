import type { MetricKey } from './metrics';
import type { MetricUnit } from './types';

export interface GlossaryEntry {
  key: MetricKey;
  /** Hotelier shorthand */
  label: string;
  name: string;
  formula: string;
  /** One plain-English sentence */
  meaning: string;
  unit: MetricUnit;
  /** Which way is good news, for colouring changes */
  goodDirection: 'up' | 'down';
}

const entries: Record<MetricKey, Omit<GlossaryEntry, 'key'>> = {
  occupancy: {
    label: 'Occupancy',
    name: 'Occupancy',
    formula: 'rooms sold ÷ rooms available',
    meaning: 'The share of the rooms the hotel could sell that were sold.',
    unit: 'percent',
    goodDirection: 'up',
  },
  averageDailyRate: {
    label: 'ADR',
    name: 'Average daily rate',
    formula: 'room revenue ÷ rooms sold',
    meaning: 'The average price paid for one room for one night.',
    unit: 'currency',
    goodDirection: 'up',
  },
  revenuePerAvailableRoom: {
    label: 'RevPAR',
    name: 'Revenue per available room',
    formula: 'room revenue ÷ rooms available',
    meaning:
      'Room revenue for every room the hotel could sell, so it reflects both how full the hotel was and the price.',
    unit: 'currency',
    goodDirection: 'up',
  },
  distributionCost: {
    label: 'Distribution cost',
    name: 'Distribution cost',
    formula: 'Σ per channel (room revenue × commission % ÷ 100 + bookings × cost per booking)',
    meaning: 'What the hotel pays booking channels for bringing in its room revenue.',
    unit: 'currency',
    goodDirection: 'down',
  },
  netRoomRevenue: {
    label: 'Net room revenue',
    name: 'Net room revenue',
    formula: 'room revenue − distribution cost',
    meaning: 'Room revenue the hotel keeps after paying its booking channels.',
    unit: 'currency',
    goodDirection: 'up',
  },
  netRevenuePerAvailableRoom: {
    label: 'NetPAR',
    name: 'Net revenue per available room',
    formula: 'net room revenue ÷ rooms available',
    meaning: 'Room revenue kept after channel costs, for every room the hotel could sell.',
    unit: 'currency',
    goodDirection: 'up',
  },
  netRate: {
    label: 'Net ADR',
    name: 'Net rate',
    formula: 'net room revenue ÷ rooms sold',
    meaning: 'What the hotel keeps for one room for one night after channel costs.',
    unit: 'currency',
    goodDirection: 'up',
  },
  directShare: {
    label: 'Direct share',
    name: 'Direct share of rooms sold',
    formula: 'rooms sold on the direct channel ÷ rooms sold',
    meaning:
      'The share of room nights booked with the hotel itself instead of through a third party.',
    unit: 'percent',
    goodDirection: 'up',
  },
  totalRevenue: {
    label: 'Total revenue',
    name: 'Total revenue',
    formula: 'room revenue + restaurant revenue',
    meaning: 'Everything the hotel earned from rooms and its restaurant.',
    unit: 'currency',
    goodDirection: 'up',
  },
  totalRevenuePerAvailableRoom: {
    label: 'TRevPAR',
    name: 'Total revenue per available room',
    formula: 'total revenue ÷ rooms available',
    meaning: 'Room and restaurant revenue for every room the hotel could sell.',
    unit: 'currency',
    goodDirection: 'up',
  },
  restaurantCaptureRate: {
    label: 'Capture rate',
    name: 'Restaurant capture rate',
    formula: 'covers ÷ guests in house',
    meaning:
      'Meals served in the restaurant for every guest staying in the hotel; meals for walk-in diners are included.',
    unit: 'percent',
    goodDirection: 'up',
  },
  revenuePerCover: {
    label: 'Average check',
    name: 'Revenue per cover',
    formula: 'restaurant revenue ÷ covers',
    meaning: 'What one diner spends on average.',
    unit: 'currency',
    goodDirection: 'up',
  },
  restaurantMargin: {
    label: 'Restaurant margin',
    name: 'Restaurant margin',
    formula:
      '(restaurant revenue − ingredient cost − restaurant staffing cost) ÷ restaurant revenue',
    meaning:
      'The share of restaurant revenue left after paying for ingredients and restaurant staff.',
    unit: 'percent',
    goodDirection: 'up',
  },
  staffingCost: {
    label: 'Labour cost',
    name: 'Staffing cost',
    formula: 'rooms + restaurant + front desk staffing cost',
    meaning: 'What the hotel paid for staff in all departments.',
    unit: 'currency',
    goodDirection: 'down',
  },
  staffingCostPerOccupiedRoom: {
    label: 'Labour CPOR',
    name: 'Staffing cost per occupied room',
    formula: 'staffing cost ÷ rooms sold',
    meaning: 'Staff cost for every room night sold.',
    unit: 'currency',
    goodDirection: 'down',
  },
  staffingCostPercent: {
    label: 'Labour %',
    name: 'Staffing cost percent',
    formula: 'staffing cost ÷ total revenue',
    meaning: 'The share of total revenue spent on staff.',
    unit: 'percent',
    goodDirection: 'down',
  },
  operatingProfit: {
    label: 'GOP',
    name: 'Operating profit',
    formula:
      'total revenue − distribution cost − ingredient cost − staffing cost − other operating costs per day × days',
    meaning:
      'What is left of revenue after channel costs, ingredients, staff and other running costs.',
    unit: 'currency',
    goodDirection: 'up',
  },
  profitPerAvailableRoom: {
    label: 'GOPPAR',
    name: 'Profit per available room',
    formula: 'operating profit ÷ rooms available',
    meaning: 'Operating profit for every room the hotel could sell.',
    unit: 'currency',
    goodDirection: 'up',
  },
  profitMargin: {
    label: 'GOP margin',
    name: 'Profit margin',
    formula: 'operating profit ÷ total revenue',
    meaning: 'The share of total revenue that ends up as operating profit.',
    unit: 'percent',
    goodDirection: 'up',
  },
  bookingPace: {
    label: 'Pace',
    name: 'Booking pace',
    formula:
      'rooms booked as of today ÷ rooms booked at the same point last year (stay dates and snapshot date 364 days earlier)',
    meaning:
      'How bookings for future stays compare with where they stood a year ago; 1 means level.',
    unit: 'ratio',
    goodDirection: 'up',
  },
  bookingPickup: {
    label: 'Pickup',
    name: 'Booking pickup',
    formula: 'rooms booked as of today − rooms booked n days earlier',
    meaning: 'Rooms added for future stays over the last n days.',
    unit: 'count',
    goodDirection: 'up',
  },
};

/** One entry per metric, used for tooltips, for colouring changes and in the tool descriptions. */
export const glossary: GlossaryEntry[] = (Object.keys(entries) as MetricKey[]).map((key) => ({
  key,
  ...entries[key],
}));

export const glossaryEntry = (key: MetricKey): GlossaryEntry => ({ key, ...entries[key] });

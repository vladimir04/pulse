export interface Hotel {
  id: string;
  name: string;
  rooms: number;
}

export interface DayRecord {
  /** ISO date, YYYY-MM-DD */
  date: string;
  roomsAvailable: number;
  roomsSold: number;
  roomRevenue: number;
}

export interface Dataset {
  hotel: Hotel;
  days: DayRecord[];
}

/** Inclusive date range, YYYY-MM-DD. An omitted bound is open. */
export interface DateRange {
  from?: string;
  to?: string;
}

export interface Kpis {
  /** Rooms sold / rooms available, as a fraction (0–1) */
  occupancy: number;
  /** Average daily rate: room revenue / rooms sold */
  adr: number;
  /** Revenue per available room: room revenue / rooms available */
  revpar: number;
}

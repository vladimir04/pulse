import {
  HttpClient,
  HttpErrorResponse,
  httpResource,
  type HttpResourceRef,
} from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { AskInput, AskResponse } from '@shared/ask';
import type { getInsights } from '@shared/detectors';
import type { GlossaryEntry } from '@shared/glossary';
// Types only: the query module itself carries the whole dataset.
import type * as queries from '@shared/queries';
import type {
  BookingPace,
  ChannelPerformance,
  Event,
  Hotel,
  Insight,
  Kpis,
  RestaurantPerformance,
  StaffingPerformance,
  Timeseries,
} from '@shared/types';
import type { UserProfile } from '@shared/users';
import { firstValueFrom } from 'rxjs';

/** What /api/hotels returns: the hotels, the dataset's "today" and the dates that have data. */
export type HotelDirectory = ReturnType<typeof queries.getCoverage> & {
  asOf: string;
  hotels: Hotel[];
};

/** The input a shared query takes, which is also what its route takes as query parameters. */
type Input<Query extends (input: never) => unknown> = Parameters<Query>[0];

/**
 * A request's parameters as a function of signals, so the request reruns when they change.
 * Return undefined while there is nothing to ask for yet.
 */
type Params<Value> = () => Value | undefined;

/**
 * Typed client for /api/*, and the only place the app talks HTTP. Each read returns a resource
 * that belongs to whoever asked for it, so call these from an injection context (a field
 * initialiser of a page or a core service).
 */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);

  /** The user, or undefined when the credentials are refused. Rejects on any other failure. */
  async login(email: string, password: string): Promise<UserProfile | undefined> {
    try {
      const request = this.http.post<{ user: UserProfile }>('/api/login', { email, password });
      return (await firstValueFrom(request)).user;
    } catch (failure) {
      if (failure instanceof HttpErrorResponse && failure.status === 401) return undefined;
      throw failure;
    }
  }

  /** Asks a question about one hotel. Rejects when no answer came back. */
  ask(input: AskInput): Promise<AskResponse> {
    return firstValueFrom(this.http.post<AskResponse>('/api/ask', input));
  }

  hotels(): HttpResourceRef<HotelDirectory | undefined> {
    return this.get('/api/hotels', () => ({}));
  }

  metrics(): HttpResourceRef<GlossaryEntry[] | undefined> {
    return this.get('/api/metrics', () => ({}));
  }

  kpis(params: Params<Input<typeof queries.getKpis>>): HttpResourceRef<Kpis | undefined> {
    return this.get('/api/kpis', params);
  }

  timeseries(
    params: Params<Input<typeof queries.getTimeseries>>,
  ): HttpResourceRef<Timeseries | undefined> {
    return this.get('/api/timeseries', params);
  }

  channelPerformance(
    params: Params<Input<typeof queries.getChannelPerformance>>,
  ): HttpResourceRef<ChannelPerformance[] | undefined> {
    return this.get('/api/channel-performance', params);
  }

  bookingPace(
    params: Params<Input<typeof queries.getBookingPace>>,
  ): HttpResourceRef<BookingPace | undefined> {
    return this.get('/api/booking-pace', params);
  }

  restaurantPerformance(
    params: Params<Input<typeof queries.getRestaurantPerformance>>,
  ): HttpResourceRef<RestaurantPerformance | undefined> {
    return this.get('/api/restaurant-performance', params);
  }

  staffing(
    params: Params<Input<typeof queries.getStaffing>>,
  ): HttpResourceRef<StaffingPerformance | undefined> {
    return this.get('/api/staffing', params);
  }

  events(params: Params<Input<typeof queries.getEvents>>): HttpResourceRef<Event[] | undefined> {
    return this.get('/api/events', params);
  }

  insights(params: Params<Input<typeof getInsights>>): HttpResourceRef<Insight[] | undefined> {
    return this.get('/api/insights', params);
  }

  private get<Result>(url: string, params: Params<object>): HttpResourceRef<Result | undefined> {
    return httpResource<Result>(() => {
      const query = params();
      if (!query) return undefined;
      // Leave out parameters that were not given rather than sending "undefined".
      const given = Object.entries(query).filter(([, value]) => value !== undefined);
      return { url, params: Object.fromEntries(given) };
    });
  }
}

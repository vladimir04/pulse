import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationRef, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { HotelId } from '@shared/types';
import { beforeEach, describe, expect, it } from 'vitest';
import { kpis, mark } from '../../testing/fixtures';
import { ApiService } from './api.service';

describe('ApiService', () => {
  let api: ApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(ApiService);
    http = TestBed.inject(HttpTestingController);
  });

  it('asks for a query with its parameters, and again when they change', async () => {
    const hotelId = signal<HotelId>('hotel-central');
    const figures = TestBed.runInInjectionContext(() =>
      api.kpis(() => ({ hotelId: hotelId(), from: '2026-11-01', to: '2026-11-17' })),
    );

    TestBed.tick();
    http.expectOne('/api/kpis?hotelId=hotel-central&from=2026-11-01&to=2026-11-17').flush(kpis);
    await TestBed.inject(ApplicationRef).whenStable();
    expect(figures.value()).toEqual(kpis);

    hotelId.set('marina-resort');
    TestBed.tick();
    http.expectOne('/api/kpis?hotelId=marina-resort&from=2026-11-01&to=2026-11-17');
  });

  it('waits until there is something to ask for', () => {
    TestBed.runInInjectionContext(() => api.kpis(() => undefined));

    TestBed.tick();
    http.expectNone((request) => request.url === '/api/kpis');
  });

  it('leaves out parameters that were not given', () => {
    TestBed.runInInjectionContext(() =>
      api.insights(() => ({ hotelId: 'hotel-central', role: undefined })),
    );

    TestBed.tick();
    http.expectOne('/api/insights?hotelId=hotel-central');
  });

  it('has a route for every query', () => {
    const period = { hotelId: 'hotel-central' as const, from: '2026-10-01', to: '2026-10-31' };
    TestBed.runInInjectionContext(() => {
      api.hotels();
      api.metrics();
      api.timeseries(() => ({ ...period, metric: 'occupancy', grain: 'week' }));
      api.channelPerformance(() => period);
      api.bookingPace(() => ({
        hotelId: 'hotel-central',
        stayFrom: '2026-12-01',
        stayTo: '2026-12-31',
      }));
      api.restaurantPerformance(() => period);
      api.staffing(() => period);
      api.events(() => period);
    });

    TestBed.tick();
    const asked = http.match(() => true).map((request) => request.request.url);
    expect(asked.sort()).toEqual([
      '/api/booking-pace',
      '/api/channel-performance',
      '/api/events',
      '/api/hotels',
      '/api/metrics',
      '/api/restaurant-performance',
      '/api/staffing',
      '/api/timeseries',
    ]);
  });

  it('signs in with the email and password', async () => {
    const attempt = api.login('mark@pulse.com', 'anything');

    const request = http.expectOne('/api/login');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ email: 'mark@pulse.com', password: 'anything' });
    request.flush({ user: mark });
    await expect(attempt).resolves.toEqual(mark);
  });

  it('reads refused credentials as no user', async () => {
    const attempt = api.login('nobody@pulse.com', 'anything');

    http
      .expectOne('/api/login')
      .flush({ error: 'unknown_email' }, { status: 401, statusText: 'Unauthorized' });
    await expect(attempt).resolves.toBeUndefined();
  });

  it('fails when the API cannot be reached', async () => {
    const attempt = api.login('mark@pulse.com', 'anything');

    http.expectOne('/api/login').flush('', { status: 503, statusText: 'Service Unavailable' });
    await expect(attempt).rejects.toBeInstanceOf(HttpErrorResponse);
  });
});

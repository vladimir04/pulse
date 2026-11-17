import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
  type TestRequest,
} from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { HotelId } from '@shared/types';
import { beforeEach, describe, expect, it } from 'vitest';
import { AuthService } from '../../core/auth/auth.service';
import { HotelContextService } from '../../core/context/hotel-context.service';
import { directory, insight, kpis, mark } from '../../testing/fixtures';
import { BlankPage, landed, stubCharts, text } from '../../testing/helpers';
import { BriefingPage } from './briefing-page';
import { InsightCard } from './insight-card';

const SERVER_ERROR = { status: 500, statusText: 'Server Error' };

describe('BriefingPage', () => {
  let fixture: ComponentFixture<BriefingPage>;
  let http: HttpTestingController;
  let context: HotelContextService;

  const page = (): HTMLElement => fixture.nativeElement;
  const headline = (): string => text(page().querySelector('h1'));
  const cards = (): string[] => [...page().querySelectorAll('app-insight-card h2')].map(text);
  const busy = (): boolean => page().querySelector('main')!.getAttribute('aria-busy') === 'true';

  /** The request for the key figures: month to date, for the hotel on screen. */
  const kpisRequest = (hotelId: HotelId = 'hotel-central'): TestRequest =>
    http.expectOne(`/api/kpis?hotelId=${hotelId}&from=2026-11-01&to=2026-11-17`);
  /** The request for the insights: ranked for Mark, who is a general manager. */
  const insightsRequest = (hotelId: HotelId = 'hotel-central'): TestRequest =>
    http.expectOne(`/api/insights?hotelId=${hotelId}&role=general_manager`);

  /** Redraws after an answer, while other requests may still be open. */
  async function redraw(): Promise<void> {
    await landed();
    fixture.detectChanges();
  }

  // Mark opens the briefing; the hotels and the dataset's "today" have arrived, the key
  // figures and the insights have been asked for.
  beforeEach(async () => {
    stubCharts(InsightCard);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: '**', component: BlankPage }]),
        { provide: AuthService, useValue: { user: signal(mark) } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    context = TestBed.inject(HotelContextService);
    fixture = TestBed.createComponent(BriefingPage);
    fixture.detectChanges();
    http.expectOne('/api/hotels').flush(directory);
    await redraw();
  });

  it('holds placeholders in place of the figures and findings while they load', () => {
    kpisRequest();
    insightsRequest();

    expect(busy()).toBe(true);
    expect(headline()).toBe('Loading today’s briefing');
    expect(page().querySelector('[aria-label="Key figures, loading"]')).not.toBeNull();
    expect(page().querySelector('[aria-label="Insights, loading"]')).not.toBeNull();
    expect(context.figuresLoading()).toBe(true);
  });

  it('shows the key figures and the findings in the order they were ranked', async () => {
    kpisRequest().flush(kpis);
    insightsRequest().flush([
      insight(),
      insight({ id: 'pace', severity: 'warning', headline: 'December has fewer rooms booked.' }),
      insight({ id: 'direct', severity: 'positive', headline: 'More guests booked directly.' }),
    ]);
    await fixture.whenStable();

    expect(busy()).toBe(false);
    expect(headline()).toBe('2 things need attention at Hotel Central Brussels');
    expect(text(page())).toContain('1–17 Nov 2026 vs the same weekdays in 2025');
    expect(page().querySelectorAll('app-kpi-tile').length).toBe(5);
    expect(cards()).toEqual([
      'Profit in October 2026 was 13.7% lower than a year earlier.',
      'December has fewer rooms booked.',
      'More guests booked directly.',
    ]);
    expect(context.figuresLoading()).toBe(false);
  });

  it('says so when nothing needs attention', async () => {
    kpisRequest().flush(kpis);
    insightsRequest().flush([]);
    await fixture.whenStable();

    expect(headline()).toBe('Everything is within normal range at Hotel Central Brussels');
    const calm = page().querySelector('app-empty-state')!;
    expect(text(calm.querySelector('h2'))).toBe('Nothing needs attention today.');
    expect(text(calm)).toContain('Checked Tue 17 Nov.');
    expect(calm.querySelector('a')!.getAttribute('href')).toBe('/explore');
  });

  it('keeps good news on screen and says nothing else needs attention', async () => {
    kpisRequest().flush(kpis);
    insightsRequest().flush([insight({ severity: 'positive', headline: 'More guests booked.' })]);
    await fixture.whenStable();

    expect(headline()).toBe('Everything is within normal range at Hotel Central Brussels');
    expect(cards()).toEqual(['More guests booked.']);
    expect(text(page().querySelector('app-empty-state h2'))).toBe('Nothing else needs attention.');
  });

  it('keeps the key figures and offers a retry when the insights do not load', async () => {
    kpisRequest().flush(kpis);
    insightsRequest().flush('', SERVER_ERROR);
    await fixture.whenStable();

    const failure = page().querySelector('[role=alert]')!;
    expect(headline()).toBe('Hotel Central Brussels');
    expect(text(failure)).toContain('Today’s insights did not load.');
    expect(text(failure)).toContain('The figures above are up to date.');
    expect(page().querySelectorAll('app-kpi-tile').length).toBe(5);

    failure.querySelector('button')!.click();
    await redraw();
    expect(text(page().querySelector('app-inline-error'))).toContain(
      'Loading today’s insights again.',
    );

    insightsRequest().flush([insight()]);
    await fixture.whenStable();
    expect(page().querySelector('app-inline-error')).toBeNull();
    expect(headline()).toBe('1 thing needs attention at Hotel Central Brussels');
  });

  it('still shows the findings when only the key figures do not load', async () => {
    kpisRequest().flush('', SERVER_ERROR);
    insightsRequest().flush([insight()]);
    await fixture.whenStable();

    expect(text(page().querySelector('[role=alert]'))).toContain(
      'Today’s key figures did not load.',
    );
    expect(page().querySelectorAll('app-kpi-tile').length).toBe(0);
    expect(cards()).toHaveLength(1);
  });

  it('loads both again for another hotel', async () => {
    kpisRequest().flush(kpis);
    insightsRequest().flush([insight()]);
    await fixture.whenStable();

    context.hotelId.set('marina-resort');
    await redraw();

    expect(busy()).toBe(true);
    kpisRequest('marina-resort');
    insightsRequest('marina-resort');
  });

  it('drops the comparison with last year when it is switched off', async () => {
    kpisRequest().flush(kpis);
    insightsRequest().flush([]);
    context.compareToLastYear.set(false);
    await fixture.whenStable();

    expect(text(page())).not.toContain('vs the same weekdays');
    expect(page().querySelectorAll('app-kpi-tile app-delta-chip').length).toBe(0);
  });

  it('opens Explore on the hotel and period of the finding that is followed', async () => {
    kpisRequest().flush(kpis);
    insightsRequest().flush([insight({ hotelId: 'marina-resort' })]);
    await fixture.whenStable();

    page().querySelector<HTMLAnchorElement>('app-insight-card a')!.click();

    expect(context.hotelId()).toBe('marina-resort');
    expect(context.period()).toEqual({ from: '2026-10-01', to: '2026-10-31' });
  });
});

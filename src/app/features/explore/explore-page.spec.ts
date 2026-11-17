import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { HotelContextService } from '../../core/context/hotel-context.service';
import {
  captureSeries,
  channels,
  events,
  occupancySeries,
  restaurant,
  staffing,
} from '../../testing/explore-fixtures';
import { directory, kpis } from '../../testing/fixtures';
import { landed, stubCharts, text } from '../../testing/helpers';
import { ExplorePage } from './explore-page';
import { OccupancyPanel } from './occupancy-panel';
import { RestaurantPanel } from './restaurant-panel';

/** Hotel Central, month to date: what every panel asks about. */
const SCOPE = 'hotelId=hotel-central&from=2026-11-01&to=2026-11-17';
const REQUESTS = {
  kpis: [`/api/kpis?${SCOPE}`, kpis],
  occupancy: [`/api/timeseries?${SCOPE}&metric=occupancy&grain=day&rollingDays=7`, occupancySeries],
  events: [`/api/events?${SCOPE}`, events],
  staffing: [`/api/staffing?${SCOPE}`, staffing],
  channels: [`/api/channel-performance?${SCOPE}`, channels],
  restaurant: [`/api/restaurant-performance?${SCOPE}`, restaurant],
  capture: [
    `/api/timeseries?${SCOPE}&metric=restaurantCaptureRate&grain=week&weekdays=monToThu`,
    captureSeries,
  ],
} as const;
type Request = keyof typeof REQUESTS;

describe('ExplorePage', () => {
  let fixture: ComponentFixture<ExplorePage>;
  let http: HttpTestingController;
  let context: HotelContextService;

  const page = (): HTMLElement => fixture.nativeElement;
  const panel = (title: string): HTMLElement =>
    [...page().querySelectorAll('h2')]
      .find((heading) => text(heading) === title)!
      .closest('section, app-chart-frame')!;

  /** Answers the requests named, all of them by default; `failing` gets a server error. */
  function answer(names: Request[] = Object.keys(REQUESTS) as Request[], failing?: Request): void {
    for (const name of names) {
      const [url, body] = REQUESTS[name];
      if (name === failing) http.expectOne(url).flush('', { status: 500, statusText: 'Error' });
      else http.expectOne(url).flush(body);
    }
  }

  /** Opens Explore; the hotels and the dataset's "today" arrive, and the panels start loading. */
  async function open(): Promise<void> {
    fixture = TestBed.createComponent(ExplorePage);
    fixture.detectChanges();
    http.expectOne('/api/hotels').flush(directory);
    await landed();
    fixture.detectChanges();
  }

  beforeEach(() => {
    stubCharts(OccupancyPanel);
    stubCharts(RestaurantPanel);
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    http = TestBed.inject(HttpTestingController);
    context = TestBed.inject(HotelContextService);
  });

  afterEach(() => {
    history.replaceState(null, '');
  });

  it('holds a placeholder in each of its four panels while they load', async () => {
    await open();

    for (const title of ['Occupancy', 'Staffing', 'Channels', 'Restaurant']) {
      expect(panel(title).querySelector('app-skeleton')).not.toBeNull();
    }
    expect(context.figuresLoading()).toBe(true);
  });

  it('shows occupancy, staffing, channels and the restaurant for the period on screen', async () => {
    await open();
    answer();
    await fixture.whenStable();

    expect(text(panel('Occupancy'))).toContain(
      'Occupancy averaged 79.3% over this period, 2.5 points above the same weekdays last year.',
    );
    expect(text(panel('Occupancy'))).toContain('Corporate budgets cut');
    expect(text(panel('Occupancy'))).toContain('1–17 Nov 2026 · vs the same weekdays in 2025');

    expect([...panel('Staffing').querySelectorAll('li')].map(text)).toEqual([
      'Rooms€28.40+€1.50',
      'Restaurant€11.20+€0.05',
      'Front desk€6.50€0.00',
    ]);
    expect(text(panel('Staffing'))).toContain('Rooms changed most, up €1.50.');

    // Sorted by what the hotel keeps per room night, not by revenue as the API answers.
    expect([...panel('Channels').querySelectorAll('tbody th')].map(text)).toEqual([
      'Direct website',
      'Expedia',
      'Booking.com',
      'Total',
    ]);
    expect(text(panel('Channels'))).toContain(
      'Booking.com brings the most gross revenue but ranks third on net rate.',
    );

    expect([...panel('Restaurant').querySelectorAll('dl > div')].map(text)).toEqual([
      'Capture rate33.9%−9.2 pts',
      'Revenue per cover€38.000.0%',
      'Margin19.7%−0.8 pts',
    ]);
    expect(page().querySelector('app-skeleton')).toBeNull();
    expect(context.figuresLoading()).toBe(false);
  });

  it('offers a retry for a panel that did not load and keeps the others', async () => {
    await open();
    answer(undefined, 'staffing');
    await fixture.whenStable();

    const failure = page().querySelector('[role=alert]')!;
    expect(text(failure)).toContain('Staffing did not load.');
    expect(panel('Channels').querySelector('table')).not.toBeNull();

    failure.querySelector('button')!.click();
    await landed();
    fixture.detectChanges();
    answer(['staffing']);
    await fixture.whenStable();

    expect(page().querySelector('[role=alert]')).toBeNull();
    expect(text(panel('Staffing'))).toContain('All departments');
  });

  it('leaves last year out when the comparison is switched off', async () => {
    context.compareToLastYear.set(false);
    await open();
    answer();
    await fixture.whenStable();

    expect(text(panel('Occupancy'))).toContain('Occupancy averaged 79.3% over this period.');
    expect([...panel('Staffing').querySelectorAll('li')].map(text)).toEqual([
      'Rooms€28.40',
      'Restaurant€11.20',
      'Front desk€6.50',
    ]);
    expect(text(panel('Restaurant'))).not.toContain('pts');
  });

  it('says which insight it was opened from, until the hotel or period changes', async () => {
    const openedFrom = {
      headline: 'Profit was 13.7% lower than a year earlier.',
      hotelId: 'hotel-central',
      period: { from: '2026-11-01', to: '2026-11-17' },
    };
    history.replaceState({ openedFrom }, '');
    await open();

    expect(text(page())).toContain('Opened from “Profit was 13.7% lower than a year earlier.”');
    const back = [...page().querySelectorAll('a')].find(
      (link) => text(link) === 'Back to briefing',
    )!;
    expect(back.getAttribute('href')).toBe('/briefing');

    context.hotelId.set('marina-resort');
    await landed();
    fixture.detectChanges();
    expect(text(page())).not.toContain('Opened from');
  });
});

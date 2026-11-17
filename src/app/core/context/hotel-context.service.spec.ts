import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { directory } from '../../testing/fixtures';
import { HotelContextService } from './hotel-context.service';

describe('HotelContextService', () => {
  let context: HotelContextService;

  /** Answers /api/hotels, which tells the app its hotels and the dataset's "today". */
  async function directoryArrives(): Promise<void> {
    TestBed.inject(HttpTestingController).expectOne('/api/hotels').flush(directory);
    await TestBed.inject(ApplicationRef).whenStable();
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    context = TestBed.inject(HotelContextService);
    TestBed.tick();
  });

  it('has no hotels and no period until the directory arrives', () => {
    expect(context.hotels()).toEqual([]);
    expect(context.hotel()).toBeUndefined();
    expect(context.presets()).toEqual([]);
    expect(context.period()).toBeUndefined();
  });

  it('offers periods that end on the dataset’s today, not the viewer’s', async () => {
    await directoryArrives();

    expect(context.asOf()).toBe('2026-11-17');
    expect(context.presets().map(({ label, period }) => [label, period.from, period.to])).toEqual([
      ['Month to date', '2026-11-01', '2026-11-17'],
      ['Last month', '2026-10-01', '2026-10-31'],
      ['Last 30 days', '2026-10-19', '2026-11-17'],
      ['Last 90 days', '2026-08-20', '2026-11-17'],
    ]);
  });

  it('starts on month to date and keeps a period that is picked', async () => {
    await directoryArrives();
    expect(context.period()).toEqual({ from: '2026-11-01', to: '2026-11-17' });

    context.period.set({ from: '2026-10-01', to: '2026-10-31' });
    expect(context.period()).toEqual({ from: '2026-10-01', to: '2026-10-31' });
  });

  it('follows the selected hotel', async () => {
    await directoryArrives();
    expect(context.hotel()?.name).toBe('Hotel Central Brussels');

    context.hotelId.set('marina-resort');
    expect(context.hotel()?.name).toBe('Marina Resort Algarve');
  });
});

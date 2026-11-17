import { computed, inject, Injectable, linkedSignal, signal } from '@angular/core';
import type { HotelId, Period } from '@shared/types';
import { lastDays, lastFullMonth, monthToDate } from '../../util/date';
import { ApiService } from '../api/api.service';

export interface PeriodPreset {
  id: 'monthToDate' | 'lastMonth' | 'last30Days' | 'last90Days';
  label: string;
  period: Period;
}

/** What the app is looking at: which hotel, which period, and whether last year is shown. */
@Injectable({ providedIn: 'root' })
export class HotelContextService {
  private readonly directory = inject(ApiService).hotels();

  /** The dataset's "today", once it is known. */
  readonly asOf = computed(() =>
    this.directory.hasValue() ? this.directory.value().asOf : undefined,
  );

  /** The hotels the switcher offers. */
  readonly hotels = computed(() =>
    this.directory.hasValue() ? this.directory.value().hotels : [],
  );
  readonly hotelId = signal<HotelId>('hotel-central');
  readonly hotel = computed(() =>
    this.hotels().find((candidate) => candidate.id === this.hotelId()),
  );

  /** The periods the date range offers, all ending at or before "today". */
  readonly presets = computed<PeriodPreset[]>(() => {
    const asOf = this.asOf();
    if (!asOf) return [];
    return [
      { id: 'monthToDate', label: 'Month to date', period: monthToDate(asOf) },
      { id: 'lastMonth', label: 'Last month', period: lastFullMonth(asOf) },
      { id: 'last30Days', label: 'Last 30 days', period: lastDays(asOf, 30) },
      { id: 'last90Days', label: 'Last 90 days', period: lastDays(asOf, 90) },
    ];
  });

  /** Starts as month to date, once "today" is known. */
  readonly period = linkedSignal<Period | undefined>(() => this.presets()[0]?.period);
  readonly compareToLastYear = signal(true);

  /** True while the page on screen is fetching its figures; the top bar's stamp waits for it. */
  readonly figuresLoading = signal(false);
}

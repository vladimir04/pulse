import { computed, inject, Injectable, linkedSignal, signal } from '@angular/core';
import type { HotelId, Period } from '@shared/types';
import { lastDays } from '../../util/date';
import { ApiService } from '../api/api.service';

/** Days on screen until a period is picked. */
const DEFAULT_PERIOD_DAYS = 14;

/** What the app is looking at: which hotel, which period, and whether last year is shown. */
@Injectable({ providedIn: 'root' })
export class HotelContextService {
  private readonly directory = inject(ApiService).hotels();

  /** The hotels the switcher offers. */
  readonly hotels = computed(() =>
    this.directory.hasValue() ? this.directory.value().hotels : [],
  );
  readonly hotelId = signal<HotelId>('hotel-central');

  /** Starts as the most recent days up to the dataset's "today", once that is known. */
  readonly period = linkedSignal<Period | undefined>(() =>
    this.directory.hasValue()
      ? lastDays(this.directory.value().asOf, DEFAULT_PERIOD_DAYS)
      : undefined,
  );
  readonly compareToLastYear = signal(true);
}

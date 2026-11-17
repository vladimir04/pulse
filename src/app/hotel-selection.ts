import { httpResource } from '@angular/common/http';
import { computed, Injectable, signal } from '@angular/core';
import type { Hotel, HotelId } from '@shared/types';

/** The hotel the app is showing, and the hotels the switcher offers. */
@Injectable({ providedIn: 'root' })
export class HotelSelection {
  private readonly directory = httpResource<{ hotels: Hotel[] }>(() => '/api/hotels');

  readonly hotels = computed(() =>
    this.directory.hasValue() ? this.directory.value().hotels : [],
  );
  readonly selectedId = signal<HotelId>('hotel-central');
}

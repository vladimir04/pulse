import { Component, computed, effect, inject, OnDestroy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api/api.service';
import type { ExploreOrigin } from '../../core/context/explore-origin';
import { HotelContextService } from '../../core/context/hotel-context.service';
import { InlineError } from '../../ui/inline-error';
import { ChannelsPanel } from './channels-panel';
import { OccupancyPanel } from './occupancy-panel';
import { RestaurantPanel } from './restaurant-panel';
import { StaffingPanel } from './staffing-panel';

/** The window of the smoothed occupancy line, in days. */
const ROLLING_DAYS = 7;

/** The insight this visit started from, if the navigation carried one. */
function originOfVisit(): ExploreOrigin | undefined {
  const origin: Partial<ExploreOrigin> | undefined = history.state?.openedFrom;
  return origin?.headline && origin.hotelId && origin.period
    ? (origin as ExploreOrigin)
    : undefined;
}

/**
 * Explore: the hotel on screen over the period on screen, in four panels. Each panel loads on
 * its own, so one that fails offers a retry while the others stay.
 */
@Component({
  selector: 'app-explore-page',
  imports: [ChannelsPanel, InlineError, OccupancyPanel, RestaurantPanel, RouterLink, StaffingPanel],
  host: { class: 'contents' },
  templateUrl: './explore-page.html',
})
export class ExplorePage implements OnDestroy {
  private readonly api = inject(ApiService);
  protected readonly context = inject(HotelContextService);

  private readonly origin = originOfVisit();
  /** The insight's headline, for as long as Explore still shows its hotel and period. */
  protected readonly openedFrom = computed(() => {
    const [origin, period] = [this.origin, this.context.period()];
    const unchanged =
      origin?.hotelId === this.context.hotelId() &&
      origin.period.from === period?.from &&
      origin.period.to === period.to;
    return unchanged ? origin.headline : undefined;
  });

  /** What every panel asks about: the hotel and period on screen, once the period is known. */
  private readonly scope = computed(() => {
    const period = this.context.period();
    return period && { hotelId: this.context.hotelId(), ...period };
  });

  protected readonly kpis = this.api.kpis(this.scope);
  protected readonly occupancy = this.api.timeseries(() => {
    const scope = this.scope();
    return scope && { ...scope, metric: 'occupancy', grain: 'day', rollingDays: ROLLING_DAYS };
  });
  protected readonly events = this.api.events(this.scope);
  protected readonly staffing = this.api.staffing(this.scope);
  protected readonly channels = this.api.channelPerformance(this.scope);
  protected readonly restaurant = this.api.restaurantPerformance(this.scope);
  protected readonly capture = this.api.timeseries(() => {
    const scope = this.scope();
    return (
      scope && { ...scope, metric: 'restaurantCaptureRate', grain: 'week', weekdays: 'monToThu' }
    );
  });

  private readonly all = [
    this.kpis,
    this.occupancy,
    this.events,
    this.staffing,
    this.channels,
    this.restaurant,
    this.capture,
  ];

  constructor() {
    // The top bar's freshness stamp waits while this page is fetching.
    effect(() =>
      this.context.figuresLoading.set(this.all.some((resource) => resource.isLoading())),
    );
  }

  ngOnDestroy(): void {
    this.context.figuresLoading.set(false);
  }

  /** The occupancy panel also reads the period's figure and its events. */
  protected retryOccupancy(): void {
    for (const resource of [this.occupancy, this.kpis, this.events]) resource.reload();
  }

  protected retryRestaurant(): void {
    for (const resource of [this.restaurant, this.capture]) resource.reload();
  }
}

import { Component, computed, effect, inject, OnDestroy, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideArrowRight } from '@lucide/angular';
import type { Insight } from '@shared/types';
import { greeting } from '@shared/users';
import { ApiService } from '../../core/api/api.service';
import { AuthService } from '../../core/auth/auth.service';
import { HotelContextService } from '../../core/context/hotel-context.service';
import { EmptyState } from '../../ui/empty-state';
import { InlineError } from '../../ui/inline-error';
import { PillButton } from '../../ui/pill-button';
import { Skeleton } from '../../ui/skeleton';
import { formatDate, formatPeriod } from '../../util/format';
import { BriefingHeader } from './briefing-header';
import { InsightCard } from './insight-card';
import { KpiStrip } from './kpi-strip';

/** Widths of the three skeleton cards' lines, so they look like three different findings. */
const SKELETON_CARDS = [
  { headline: 'w-[440px]', why: 'w-full', nextMove: 'w-3/4' },
  { headline: 'w-[360px]', why: 'w-2/3', nextMove: 'w-1/2' },
  { headline: 'w-[520px]', why: 'w-3/4', nextMove: 'w-2/3' },
];

/**
 * The briefing: the key figures for the period on screen, then the hotel's findings ranked for
 * the signed-in user's role. Both reload when the hotel changes; the figures also follow the
 * period and the comparison switch.
 */
@Component({
  selector: 'app-briefing-page',
  imports: [
    BriefingHeader,
    EmptyState,
    InlineError,
    InsightCard,
    KpiStrip,
    LucideArrowRight,
    PillButton,
    RouterLink,
    Skeleton,
  ],
  host: { class: 'contents' },
  templateUrl: './briefing-page.html',
})
export class BriefingPage implements OnDestroy {
  private readonly api = inject(ApiService);
  protected readonly auth = inject(AuthService);
  protected readonly context = inject(HotelContextService);

  protected readonly skeletonCards = SKELETON_CARDS;
  /** By the viewer's clock; the date beside it comes from the data. */
  protected readonly greeting = greeting(new Date());

  protected readonly kpis = this.api.kpis(() => {
    const period = this.context.period();
    return period && { hotelId: this.context.hotelId(), ...period };
  });
  protected readonly insights = this.api.insights(() => {
    const user = this.auth.user();
    return user ? { hotelId: this.context.hotelId(), role: user.role } : undefined;
  });

  /** Set while a retry runs, so the error stays in place, disabled, instead of flashing away. */
  protected readonly retryingKpis = signal(false);
  protected readonly retryingInsights = signal(false);

  protected readonly kpisState = computed(() => {
    if (this.kpis.hasValue()) return 'ready';
    return this.kpis.error() || this.retryingKpis() ? 'failed' : 'loading';
  });
  protected readonly insightsState = computed(() => {
    if (this.insights.hasValue()) return 'ready';
    return this.insights.error() || this.retryingInsights() ? 'failed' : 'loading';
  });
  protected readonly ranked = computed(() =>
    this.insights.hasValue() ? this.insights.value() : [],
  );
  /** Critical and warning findings: the "things that need attention". */
  protected readonly attention = computed(
    () =>
      this.ranked().filter(({ severity }) => severity === 'critical' || severity === 'warning')
        .length,
  );

  protected readonly period = computed(() => {
    const period = this.context.period();
    return period ? formatPeriod(period) : '';
  });
  /** Beside the headline: the period, and what it is compared with when comparison is on. */
  protected readonly periodLabel = computed(() => {
    const period = this.context.period();
    if (!period || !this.context.compareToLastYear()) return this.period();
    const lastYear = Number(period.to.slice(0, 4)) - 1;
    return `${this.period()} vs the same weekdays in ${lastYear}`;
  });
  protected readonly checked = computed(() => {
    const asOf = this.context.asOf();
    return asOf ? ` Checked ${formatDate(asOf)}.` : '';
  });

  constructor() {
    // The top bar's freshness stamp waits while this page is fetching.
    effect(() =>
      this.context.figuresLoading.set(this.kpis.isLoading() || this.insights.isLoading()),
    );
    effect(() => {
      if (!this.kpis.isLoading()) this.retryingKpis.set(false);
    });
    effect(() => {
      if (!this.insights.isLoading()) this.retryingInsights.set(false);
    });
  }

  ngOnDestroy(): void {
    this.context.figuresLoading.set(false);
  }

  protected retryKpis(): void {
    this.retryingKpis.set(true);
    this.kpis.reload();
  }

  protected retryInsights(): void {
    this.retryingInsights.set(true);
    this.insights.reload();
  }

  /** "View in Explore": Explore opens on the finding's hotel and period. */
  protected showInExplore(insight: Insight): void {
    const hotel = this.context.hotels().find((candidate) => candidate.id === insight.hotelId);
    if (hotel) this.context.hotelId.set(hotel.id);
    this.context.period.set({ from: insight.period.from, to: insight.period.to });
  }
}

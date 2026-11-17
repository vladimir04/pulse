import { Component, computed, input } from '@angular/core';
import { explore } from '@shared/narratives';
import type { ChartSpec, Event, MetricValue, Period, Timeseries } from '@shared/types';
import { ChartFrame } from '../../ui/chart-frame';
import { EventsRow } from '../../ui/charts/events-row';
import { LineChart } from '../../ui/charts/line-chart';
import { Skeleton } from '../../ui/skeleton';
import { formatDate, formatRange } from '../../util/format';

/**
 * Occupancy over the period as a 7-day average, against the same weekdays last year, with the
 * period's events in a row under the dates. A placeholder stands in until the series arrives.
 */
@Component({
  selector: 'app-occupancy-panel',
  imports: [ChartFrame, EventsRow, LineChart, Skeleton],
  host: { class: 'contents' },
  template: `
    <app-chart-frame
      class="col-span-2"
      title="Occupancy"
      unit="% of available rooms, 7-day average"
      [summary]="summary()"
      [periodLabel]="footer()"
    >
      @if (chart(); as chart) {
        <div class="flex flex-col gap-1">
          <app-line-chart class="h-[200px]" [spec]="chart" [ariaLabel]="chartLabel()" />
          @if (rowEvents().length) {
            <app-events-row [events]="rowEvents()" [period]="period()" />
          }
        </div>
      } @else {
        <app-skeleton class="h-[240px]" />
      }
      <div legend class="flex items-center gap-4">
        @if (chart()) {
          <span class="flex items-center gap-2">
            <span class="w-4 border-t-2 border-ink" aria-hidden="true"></span>
            <span class="tabular">{{ year() }}</span>
          </span>
          @if (compared()) {
            <span class="flex items-center gap-2">
              <span class="w-4 border-t-2 border-dashed border-last-year" aria-hidden="true"></span>
              <span class="text-secondary tabular">{{ year() - 1 }}</span>
            </span>
          }
        }
      </div>
    </app-chart-frame>
  `,
})
export class OccupancyPanel {
  /** Occupancy by day, smoothed; undefined while loading. */
  readonly series = input<Timeseries>();
  /** Occupancy over the whole period, for the sentence above the chart. */
  readonly occupancy = input<MetricValue>();
  readonly events = input<Event[]>([]);
  readonly period = input.required<Period>();
  /** Show last year beside this year. */
  readonly compare = input(true);
  /** The dataset's "today", once known. */
  readonly asOf = input<string>();

  protected readonly year = computed(() => Number(this.period().to.slice(0, 4)));
  /** Last year is drawn when it is asked for and the data goes back that far. */
  protected readonly compared = computed(
    () => this.compare() && (this.series()?.lastYear.some((value) => value !== null) ?? false),
  );

  protected readonly summary = computed(() => {
    const occupancy = this.occupancy();
    if (!occupancy) return undefined;
    return explore.occupancy(
      occupancy.value,
      this.compare() ? occupancy.lastYear?.delta : undefined,
    );
  });

  protected readonly footer = computed(() =>
    [
      formatRange(this.period()),
      this.compare() ? `vs the same weekdays in ${this.year() - 1}` : '',
      this.asOf() ? `As of ${formatDate(this.asOf()!)}` : '',
    ]
      .filter(Boolean)
      .join(' · '),
  );

  protected readonly chart = computed<ChartSpec | undefined>(() => {
    const series = this.series();
    if (!series) return undefined;
    return {
      type: 'line',
      title: 'Occupancy',
      unit: series.unit,
      x: series.x,
      series: [
        ...(this.compared()
          ? [{ name: `${this.year() - 1}`, role: 'lastYear' as const, data: series.lastYear }]
          : []),
        { name: `${this.year()}`, role: 'current', data: series.current },
      ],
    };
  });

  protected readonly chartLabel = computed(() => {
    const against = this.compared() ? ` against the same weekdays in ${this.year() - 1}` : '';
    return `Occupancy, 7-day average, ${formatRange(this.period())}${against}. ${this.summary() ?? ''}`;
  });

  /** What happened at the restaurant is shown on the restaurant's own chart. */
  protected readonly rowEvents = computed(() =>
    this.events().filter((event) => event.kind !== 'restaurant'),
  );
}

import { Component, computed, input } from '@angular/core';
import { explore } from '@shared/narratives';
import type {
  ChartSpec,
  Event,
  MetricValue,
  RestaurantPerformance,
  Timeseries,
} from '@shared/types';
import { LineChart } from '../../ui/charts/line-chart';
import { Skeleton } from '../../ui/skeleton';
import { formatDelta, formatEuros, formatPercent } from '../../util/format';

/** For all three figures more is better; a change under one reads as none. */
const TONES = { better: 'text-positive', worse: 'text-critical', flat: 'text-info' };

interface FigureRow {
  label: string;
  value: string;
  change: { text: string; tone: keyof typeof TONES } | undefined;
}

function figureRow(label: string, figure: MetricValue, compare: boolean): FigureRow {
  const value =
    figure.unit === 'currency' ? formatEuros(figure.value) : formatPercent(figure.value);
  const lastYear = compare ? figure.lastYear : null;
  if (!lastYear) return { label, value, change: undefined };
  const tone = Math.abs(lastYear.delta) < 1 ? 'flat' : lastYear.delta > 0 ? 'better' : 'worse';
  return { label, value, change: { text: formatDelta(lastYear.delta, lastYear.deltaUnit), tone } };
}

/**
 * The restaurant on Mondays to Thursdays: the share of hotel guests who ate there, what a cover
 * brought in and the margin, then the capture rate week by week. A placeholder stands in until
 * the figures arrive.
 */
@Component({
  selector: 'app-restaurant-panel',
  imports: [LineChart, Skeleton],
  host: { class: 'contents' },
  template: `
    <section
      class="flex flex-col gap-4 p-4 rounded-md border border-line bg-card"
      aria-labelledby="restaurant-title"
    >
      <div class="flex flex-col gap-2">
        <div class="flex items-baseline gap-2">
          <h2 id="restaurant-title" class="text-title font-medium">Restaurant</h2>
          <span class="text-table text-secondary">{{
            compare() ? 'Monday–Thursday, vs last year' : 'Monday–Thursday'
          }}</span>
        </div>
        @if (summary(); as summary) {
          <p class="text-pretty">{{ summary }}</p>
        }
      </div>
      @if (restaurant()) {
        <dl class="flex flex-col">
          @for (row of rows(); track row.label) {
            <div class="flex items-center justify-between h-8 border-t border-line">
              <dt class="text-secondary">{{ row.label }}</dt>
              <dd class="flex items-center gap-2">
                <span class="font-medium tabular">{{ row.value }}</span>
                @if (row.change; as change) {
                  <span
                    class="w-14 text-right text-table font-medium tabular"
                    [class]="tones[change.tone]"
                    >{{ change.text }}</span
                  >
                }
              </dd>
            </div>
          }
        </dl>
        @if (chart(); as chart) {
          <figure class="flex flex-col gap-1 mt-auto">
            <figcaption class="text-table text-secondary">Capture rate by week</figcaption>
            <app-line-chart class="h-[88px]" compact [spec]="chart" [ariaLabel]="chartLabel()" />
          </figure>
        }
      } @else {
        <app-skeleton class="h-[220px]" />
      }
    </section>
  `,
})
export class RestaurantPanel {
  /** Undefined while loading. */
  readonly restaurant = input<RestaurantPerformance>();
  /** The Monday–Thursday capture rate by week. */
  readonly capture = input<Timeseries>();
  readonly events = input<Event[]>([]);
  /** Show last year beside this year. */
  readonly compare = input(true);

  protected readonly tones = TONES;

  protected readonly rows = computed(() => {
    const weekdays = this.restaurant()?.split.monToThu;
    if (!weekdays) return [];
    return [
      figureRow('Capture rate', weekdays.captureRate, this.compare()),
      figureRow('Revenue per cover', weekdays.revenuePerCover, this.compare()),
      figureRow('Margin', weekdays.margin, this.compare()),
    ];
  });

  protected readonly summary = computed(() => {
    const weekdays = this.restaurant()?.split.monToThu;
    if (!weekdays) return undefined;
    const [capture, perCover] = [weekdays.captureRate, weekdays.revenuePerCover];
    return explore.restaurant(
      { value: capture.value, points: this.compare() ? capture.lastYear?.delta : undefined },
      {
        value: perCover.value,
        percentChange: this.compare() ? perCover.lastYear?.delta : undefined,
      },
    );
  });

  protected readonly chart = computed<ChartSpec | undefined>(() => {
    const capture = this.capture();
    if (!capture?.x.length) return undefined;
    const compared = this.compare() && capture.lastYear.some((value) => value !== null);
    // A change at the restaurant is marked on the week it happened in.
    const markers = this.events()
      .filter((event) => event.kind === 'restaurant' && event.date >= capture.x[0])
      .map((event) => ({
        x: capture.x.filter((week) => week <= event.date).at(-1)!,
        label: event.label,
      }));
    return {
      type: 'line',
      title: 'Capture rate by week',
      unit: capture.unit,
      x: capture.x,
      series: [
        ...(compared
          ? [{ name: 'Last year', role: 'lastYear' as const, data: capture.lastYear }]
          : []),
        { name: 'This year', role: 'current', data: capture.current },
      ],
      markers,
    };
  });

  protected readonly chartLabel = computed(
    () => `Monday–Thursday capture rate by week. ${this.summary() ?? ''}`,
  );
}

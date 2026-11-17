import { Component, computed, input } from '@angular/core';
import { explore } from '@shared/narratives';
import type { MetricValue, StaffingPerformance } from '@shared/types';
import { Skeleton } from '../../ui/skeleton';
import { formatEuros } from '../../util/format';

const DEPARTMENTS = [
  { key: 'rooms', label: 'Rooms' },
  { key: 'restaurant', label: 'Restaurant' },
  { key: 'front_desk', label: 'Front desk' },
] as const;

/** A cost that rose is bad news; a change under one percent reads as none. */
const TONES = { better: 'text-positive', worse: 'text-critical', flat: 'text-info' };

interface CostRow {
  label: string;
  now: number;
  /** Last year's cost and the change against it, when there is a comparison. */
  before: number | undefined;
  change: number | undefined;
  tone: keyof typeof TONES;
}

function costRow(label: string, figure: MetricValue, compare: boolean): CostRow {
  const lastYear = compare ? figure.lastYear : null;
  if (!lastYear)
    return { label, now: figure.value, before: undefined, change: undefined, tone: 'flat' };
  const change = figure.value - lastYear.value;
  const tone = Math.abs(lastYear.delta) < 1 ? 'flat' : change > 0 ? 'worse' : 'better';
  return { label, now: figure.value, before: lastYear.value, change, tone };
}

/**
 * Staff cost for every occupied room, by department: this year as a bar, last year as a dashed
 * line under it, and the change in euros. A placeholder stands in until the figures arrive.
 */
@Component({
  selector: 'app-staffing-panel',
  imports: [Skeleton],
  host: { class: 'contents' },
  template: `
    <section
      class="flex flex-col gap-4 p-4 rounded-md border border-line bg-card"
      aria-labelledby="staffing-title"
    >
      <div class="flex flex-col gap-2">
        <div class="flex items-baseline gap-2">
          <h2 id="staffing-title" class="text-title font-medium">Staffing</h2>
          <span class="text-table text-secondary">{{
            compared() ? 'cost per occupied room, last year dashed' : 'cost per occupied room'
          }}</span>
        </div>
        @if (summary(); as summary) {
          <p class="text-pretty">{{ summary }}</p>
        }
      </div>
      @if (total(); as total) {
        <ul class="flex flex-col gap-4">
          @for (row of rows(); track row.label) {
            <li class="flex flex-col gap-2">
              <div class="flex items-center justify-between gap-2">
                <span>{{ row.label }}</span>
                <span class="flex items-center gap-2">
                  <span class="font-medium tabular">{{ euros(row.now) }}</span>
                  @if (row.change !== undefined) {
                    <span
                      class="w-14 text-right text-table font-medium tabular"
                      [class]="tones[row.tone]"
                      >{{ euros(row.change, { signed: true }) }}</span
                    >
                  }
                </span>
              </div>
              <div class="flex flex-col gap-1" aria-hidden="true">
                <span class="h-1 bg-ink" [style.width.%]="(row.now / scale()) * 100"></span>
                @if (row.before !== undefined) {
                  <span
                    class="border-t-2 border-dashed border-last-year"
                    [style.width.%]="(row.before / scale()) * 100"
                  ></span>
                }
              </div>
            </li>
          }
        </ul>
        <div class="flex items-center justify-between gap-2 pt-4 mt-auto border-t border-line">
          <span class="font-medium">All departments</span>
          <span class="flex items-center gap-2">
            <span class="font-medium tabular">{{ euros(total.now) }}</span>
            @if (total.change !== undefined) {
              <span
                class="w-14 text-right text-table font-medium tabular"
                [class]="tones[total.tone]"
                >{{ euros(total.change, { signed: true }) }}</span
              >
            }
          </span>
        </div>
      } @else {
        <app-skeleton class="h-[220px]" />
      }
    </section>
  `,
})
export class StaffingPanel {
  /** Undefined while loading. */
  readonly staffing = input<StaffingPerformance>();
  /** Show last year beside this year. */
  readonly compare = input(true);

  protected readonly tones = TONES;
  protected readonly euros = formatEuros;

  protected readonly rows = computed(() => {
    const staffing = this.staffing();
    if (!staffing) return [];
    return DEPARTMENTS.map(({ key, label }) =>
      costRow(label, staffing.byDepartment[key].costPerOccupiedRoom, this.compare()),
    );
  });
  protected readonly total = computed(() => {
    const staffing = this.staffing();
    return (
      staffing && costRow('All departments', staffing.staffingCostPerOccupiedRoom, this.compare())
    );
  });
  protected readonly compared = computed(() => this.total()?.before !== undefined);

  /** The widest bar stops a little short of the panel's edge. */
  protected readonly scale = computed(
    () => Math.max(...this.rows().flatMap((row) => [row.now, row.before ?? 0]), 1) * 1.06,
  );

  protected readonly summary = computed(() => {
    const total = this.total();
    if (!total) return undefined;
    return explore.staffing(
      { now: total.now, before: total.before },
      this.rows().map((row) => ({ name: row.label, now: row.now, before: row.before })),
    );
  });
}

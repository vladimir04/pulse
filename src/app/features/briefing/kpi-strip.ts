import { Component, computed, input } from '@angular/core';
import { glossaryEntry } from '@shared/glossary';
import type { Kpis } from '@shared/types';
import { KpiTile } from '../../ui/kpi-tile';
import { Skeleton } from '../../ui/skeleton';

/** The five key figures, in the order and under the labels of the design. */
const TILES = [
  { key: 'occupancy', label: 'Occupancy' },
  { key: 'averageDailyRate', label: 'ADR' },
  { key: 'revenuePerAvailableRoom', label: 'RevPAR' },
  { key: 'netRevenuePerAvailableRoom', label: 'NetPAR' },
  { key: 'operatingProfit', label: 'Operating profit' },
] as const;

/** Five KPI tiles in one row; five skeleton tiles of the same size until the figures arrive. */
@Component({
  selector: 'app-kpi-strip',
  imports: [KpiTile, Skeleton],
  host: { class: 'contents' },
  template: `
    <section
      class="flex flex-col gap-2"
      [attr.aria-label]="kpis() ? 'Key figures' : 'Key figures, loading'"
    >
      <div class="grid grid-cols-5 gap-4">
        @for (tile of tiles(); track tile.label) {
          @if (tile.figure; as figure) {
            <app-kpi-tile
              [label]="tile.label"
              [value]="figure.value"
              [unit]="figure.unit"
              [delta]="tile.delta"
              [goodDirection]="tile.entry.goodDirection"
              [tooltip]="tile.tooltip"
              [caption]="caption()"
            />
          } @else {
            <div class="flex flex-col items-start gap-2 p-4 rounded-md border border-line bg-card">
              <app-skeleton class="w-20 h-5" />
              <app-skeleton class="w-24 h-7" />
              <app-skeleton class="w-32 h-6" />
            </div>
          }
        }
      </div>
    </section>
  `,
})
export class KpiStrip {
  /** Leave undefined while loading. */
  readonly kpis = input<Kpis>();
  /** Show each figure's change against last year; otherwise the caption. */
  readonly compare = input(true);
  /** Shown under each figure when there is no comparison, usually the period. */
  readonly caption = input('');

  protected readonly tiles = computed(() => {
    const kpis = this.kpis();
    return TILES.map(({ key, label }) => {
      const entry = glossaryEntry(key);
      const figure = kpis?.[key];
      const lastYear = this.compare() ? figure?.lastYear : undefined;
      return {
        label,
        entry,
        figure,
        delta: lastYear ? { value: lastYear.delta, unit: lastYear.deltaUnit } : null,
        tooltip: { title: entry.name, text: entry.meaning },
      };
    });
  });
}

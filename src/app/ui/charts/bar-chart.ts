import { booleanAttribute, Component, computed, input } from '@angular/core';
import type { ChartSpec } from '@shared/types';
import { NgxEchartsDirective } from 'ngx-echarts';
import { chartOptions } from './chart-options';

/**
 * A bar chart drawn from a ChartSpec, with square bar ends. Give the host a height. The chart
 * is one image to assistive technology, so `ariaLabel` should say what the series show.
 */
@Component({
  selector: 'app-bar-chart',
  imports: [NgxEchartsDirective],
  host: { class: 'block', role: 'img', '[attr.aria-label]': 'ariaLabel()' },
  template: `<div echarts class="size-full" aria-hidden="true" [options]="options()"></div>`,
})
export class BarChart {
  readonly spec = input.required<ChartSpec>();
  readonly ariaLabel = input.required<string>();
  /** The small chart of an insight card: no value axis. */
  readonly compact = input(false, { transform: booleanAttribute });

  protected readonly options = computed(() => chartOptions(this.spec(), this.compact()));
}

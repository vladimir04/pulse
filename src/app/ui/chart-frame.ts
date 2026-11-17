import { Component, input } from '@angular/core';

/**
 * The panel around a chart: title, unit, an optional sentence saying what the chart shows, the
 * chart itself as content, and a footer with the legend (content marked `legend`) and the period.
 */
@Component({
  selector: 'app-chart-frame',
  host: { class: 'flex flex-col gap-4 p-4 rounded-md border border-line bg-card' },
  template: `
    <div class="flex flex-col gap-2">
      <div class="flex items-baseline gap-2">
        <h2 class="text-title font-medium">{{ title() }}</h2>
        <span class="text-table text-secondary">{{ unit() }}</span>
      </div>
      @if (summary(); as summary) {
        <p class="text-pretty">{{ summary }}</p>
      }
    </div>
    <ng-content />
    <div class="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-table">
      <div class="flex items-center gap-4"><ng-content select="[legend]" /></div>
      @if (periodLabel(); as periodLabel) {
        <span class="text-secondary tabular">{{ periodLabel }}</span>
      }
    </div>
  `,
})
export class ChartFrame {
  readonly title = input.required<string>();
  readonly unit = input.required<string>();
  readonly summary = input<string>();
  readonly periodLabel = input<string>();
}

import {
  CdkConnectedOverlay,
  CdkOverlayOrigin,
  type ConnectedPosition,
} from '@angular/cdk/overlay';
import { Component, computed, input, signal } from '@angular/core';
import type { DeltaUnit, MetricUnit } from '@shared/types';
import { formatValue } from '../util/format';
import { DeltaChip } from './delta-chip';

let tiles = 0;

/**
 * One key figure: label, value, and the change against last year. Hovering or focusing the
 * dotted label shows its glossary entry. With no delta (comparison off) the caption shows
 * instead, usually the period.
 */
@Component({
  selector: 'app-kpi-tile',
  imports: [CdkConnectedOverlay, CdkOverlayOrigin, DeltaChip],
  host: { class: 'flex flex-col items-start gap-2 p-4 rounded-md border border-line bg-card' },
  template: `
    @if (tooltip(); as tooltip) {
      <button
        #origin="cdkOverlayOrigin"
        cdkOverlayOrigin
        type="button"
        class="rounded-[2px] underline decoration-dotted decoration-muted underline-offset-4 cursor-help focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-ink"
        [class]="open() ? 'text-ink' : 'text-secondary'"
        [attr.aria-describedby]="open() ? tipId : null"
        (mouseenter)="open.set(true)"
        (mouseleave)="open.set(false)"
        (focus)="open.set(true)"
        (blur)="open.set(false)"
        (keydown.escape)="open.set(false)"
      >
        {{ label() }}
      </button>
      <ng-template
        cdkConnectedOverlay
        [cdkConnectedOverlayOrigin]="origin"
        [cdkConnectedOverlayOpen]="open()"
        [cdkConnectedOverlayPositions]="below"
      >
        <div
          role="tooltip"
          class="flex flex-col gap-1 w-[224px] p-2 rounded-md border border-line bg-card shadow-overlay text-table pointer-events-none transition-opacity duration-150 ease-out starting:opacity-0"
          [id]="tipId"
        >
          <span class="font-medium">{{ tooltip.title }}</span>
          <span class="text-secondary">{{ tooltip.text }}</span>
        </div>
      </ng-template>
    } @else {
      <span class="text-secondary">{{ label() }}</span>
    }
    <span class="text-kpi font-medium tabular">{{ formatted() }}</span>
    @if (delta(); as delta) {
      <div class="flex items-center gap-2">
        <app-delta-chip
          [value]="delta.value"
          [unit]="delta.unit"
          [goodDirection]="goodDirection()"
        />
        <span class="text-table text-secondary">vs last year</span>
      </div>
    } @else {
      <div class="flex items-center h-6">
        <span class="text-table text-secondary tabular">{{ caption() }}</span>
      </div>
    }
  `,
})
export class KpiTile {
  readonly label = input.required<string>();
  readonly value = input.required<number>();
  readonly unit = input.required<MetricUnit>();
  /** The change against last year; leave out to show the caption instead. */
  readonly delta = input<{ value: number; unit: DeltaUnit } | null>();
  /** Which way is good news; it picks the chip's colour. */
  readonly goodDirection = input<'up' | 'down'>('up');
  /** The glossary entry behind the label. */
  readonly tooltip = input<{ title: string; text: string }>();
  readonly caption = input('');

  protected readonly open = signal(false);
  protected readonly tipId = `kpi-tip-${tiles++}`;
  protected readonly formatted = computed(() => formatValue(this.value(), this.unit()));
  /** Under the label, 8px down: left edges aligned, or right edges where that would not fit. */
  protected readonly below: ConnectedPosition[] = [
    { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 8 },
    { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top', offsetY: 8 },
  ];
}

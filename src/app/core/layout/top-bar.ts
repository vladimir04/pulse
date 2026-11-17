import { CdkMenu, CdkMenuItemRadio, CdkMenuTrigger } from '@angular/cdk/menu';
import type { ConnectedPosition } from '@angular/cdk/overlay';
import { Component, computed, inject } from '@angular/core';
import {
  LucideCalendar,
  LucideCheck,
  LucideChevronDown,
  LucideChevronsUpDown,
} from '@lucide/angular';
import type { Period } from '@shared/types';
import { PulseDot } from '../../ui/pulse-dot';
import { formatDate, formatRange } from '../../util/format';
import { HotelContextService } from '../context/hotel-context.service';

/**
 * The context that applies to every view: hotel, date range, comparison with last year, and
 * how fresh the figures are.
 */
@Component({
  selector: 'app-top-bar',
  imports: [
    CdkMenu,
    CdkMenuItemRadio,
    CdkMenuTrigger,
    LucideCalendar,
    LucideCheck,
    LucideChevronDown,
    LucideChevronsUpDown,
    PulseDot,
  ],
  host: { class: 'contents' },
  templateUrl: './top-bar.html',
})
export class TopBar {
  protected readonly context = inject(HotelContextService);

  protected readonly formatRange = formatRange;
  protected readonly periodLabel = computed(() => {
    const period = this.context.period();
    return period ? formatRange(period) : '';
  });
  protected readonly asOfLabel = computed(() => {
    const asOf = this.context.asOf();
    return asOf ? formatDate(asOf) : undefined;
  });
  /** Menus open 8px under their control, left edges aligned. */
  protected readonly below: ConnectedPosition[] = [
    { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 8 },
  ];

  protected isCurrent(period: Period): boolean {
    const current = this.context.period();
    return current?.from === period.from && current.to === period.to;
  }
}

import { Component, computed, input } from '@angular/core';
import type { DeltaUnit } from '@shared/types';
import { formatDelta } from '../util/format';

/** Changes smaller than this, in the delta's unit, read as "about the same". */
const FLAT_BELOW = 1;

const TONES = {
  better: 'bg-positive-tint text-positive',
  worse: 'bg-critical-tint text-critical',
  flat: 'bg-info-tint text-info',
};

/**
 * A change against last year. The colour says better or worse, not up or down, and the text
 * always carries the sign, so the colour is never the only signal.
 */
@Component({
  selector: 'app-delta-chip',
  host: {
    class: 'flex items-center h-6 px-2 rounded-md text-table font-medium tabular',
    '[class]': 'tones[tone()]',
  },
  template: '{{ text() }}',
})
export class DeltaChip {
  readonly value = input.required<number>();
  readonly unit = input.required<DeltaUnit>();
  /** Which way is good news for this metric. */
  readonly goodDirection = input<'up' | 'down'>('up');

  protected readonly tones = TONES;
  protected readonly text = computed(() => formatDelta(this.value(), this.unit()));
  protected readonly tone = computed(() => {
    if (Math.abs(this.value()) < FLAT_BELOW) return 'flat';
    return this.value() > 0 === (this.goodDirection() === 'up') ? 'better' : 'worse';
  });
}

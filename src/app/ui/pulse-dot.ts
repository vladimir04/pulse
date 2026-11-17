import { Component, computed, input } from '@angular/core';
import { pulsePhase } from './pulse';

const TONES = {
  accent: 'bg-accent',
  positive: 'bg-positive',
  warning: 'bg-warning',
  muted: 'bg-muted',
};
const SIZES = { sm: 'size-[6px]', md: 'size-2' };

/**
 * The dot that carries the app's rhythm: pulsing in the wordmark and while something loads,
 * ringing once data is fresh, still when it is not.
 */
@Component({
  selector: 'app-pulse-dot',
  host: {
    'aria-hidden': 'true',
    '[class]': 'hostClass()',
    '[style.animation-delay]': 'motion() === "pulse" ? phase : null',
  },
  template: `
    @if (motion() === 'ring') {
      <span class="absolute inset-0 rounded-full animate-ring" [class]="tones[tone()]"></span>
      <span class="relative rounded-full" [class]="[sizes[size()], tones[tone()]]"></span>
    }
  `,
})
export class PulseDot {
  readonly tone = input<keyof typeof TONES>('accent');
  readonly motion = input<'pulse' | 'ring' | 'still'>('pulse');
  readonly size = input<keyof typeof SIZES>('sm');

  protected readonly tones = TONES;
  protected readonly sizes = SIZES;
  protected readonly phase = pulsePhase();

  // The ring is a dot with an expanding copy behind it; otherwise the host itself is the dot.
  protected readonly hostClass = computed(() => {
    const size = SIZES[this.size()];
    if (this.motion() === 'ring') return `relative flex shrink-0 ${size}`;
    const pulse = this.motion() === 'pulse' ? ' animate-pulse' : '';
    return `block shrink-0 rounded-full ${size} ${TONES[this.tone()]}${pulse}`;
  });
}

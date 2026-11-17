import { Component, input } from '@angular/core';
import { pulsePhase } from './pulse';

const VARIANTS = {
  /** Any box: give it a width and height class. */
  block: '',
  /** One line of text: give it a width class. */
  text: 'h-4',
  /** The chart of an insight card. */
  chart: 'w-[240px] h-[136px] shrink-0',
};

/** A placeholder with the size of what is loading. All skeletons pulse in phase. */
@Component({
  selector: 'app-skeleton',
  host: {
    class: 'block rounded-md bg-line animate-pulse',
    'aria-hidden': 'true',
    '[class]': 'variants[variant()]',
    '[style.animation-delay]': 'phase',
  },
  template: '',
})
export class Skeleton {
  readonly variant = input<keyof typeof VARIANTS>('block');

  protected readonly variants = VARIANTS;
  protected readonly phase = pulsePhase();
}

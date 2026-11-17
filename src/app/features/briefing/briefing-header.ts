import { Component, computed, input } from '@angular/core';
import { Skeleton } from '../../ui/skeleton';

/**
 * The top of the briefing: who it is for and when, then one line that says how the hotel is
 * doing. While loading the line is a skeleton; if the insights failed it is just the hotel.
 */
@Component({
  selector: 'app-briefing-header',
  imports: [Skeleton],
  host: { class: 'flex flex-col' },
  template: `
    <p class="text-secondary">{{ eyebrow() }}</p>
    <div class="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
      @if (state() === 'loading') {
        <h1 class="flex items-center h-9">
          <span class="sr-only">Loading today’s briefing</span>
          <app-skeleton class="w-[440px] h-7" />
        </h1>
      } @else {
        <h1 class="text-headline font-normal">{{ headline() }}</h1>
      }
      <p class="text-table text-secondary tabular">{{ periodLabel() }}</p>
    </div>
  `,
})
export class BriefingHeader {
  /** Morning, Afternoon or Evening, by the viewer's clock. */
  readonly greeting = input.required<string>();
  readonly firstName = input.required<string>();
  /** The dataset's "today", once known. */
  readonly date = input<string>();
  readonly hotelName = input.required<string>();
  readonly state = input.required<'loading' | 'failed' | 'ready'>();
  /** How many insights are critical or a warning. */
  readonly attention = input(0);
  readonly periodLabel = input('');

  protected readonly eyebrow = computed(() => {
    return `${this.greeting()}, ${this.firstName()}`;
  });

  protected readonly headline = computed(() => {
    const hotel = this.hotelName();
    const count = this.attention();
    if (this.state() === 'failed') return hotel;
    if (count === 0) return `Everything is within normal range at ${hotel}`;
    return count === 1
      ? `1 thing needs attention at ${hotel}`
      : `${count} things need attention at ${hotel}`;
  });
}

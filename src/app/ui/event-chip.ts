import { Component, input } from '@angular/core';

/** A dated cause. The diamond is the same mark that shows the date on a chart's axis. */
@Component({
  selector: 'app-event-chip',
  host: {
    class:
      'flex items-center gap-2 h-6 px-2 rounded-md border border-line bg-card text-table whitespace-nowrap',
  },
  template: `
    <span class="size-[6px] shrink-0 rotate-45 bg-ink" aria-hidden="true"></span>
    <span>{{ label() }}</span>
    <span class="text-secondary tabular">{{ date() }}</span>
  `,
})
export class EventChip {
  readonly label = input.required<string>();
  /** The date as it should read, for example 28 Sep. */
  readonly date = input.required<string>();
}

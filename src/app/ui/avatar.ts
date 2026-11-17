import { Component, input } from '@angular/core';

/** A person's initials in a 28px circle. Decorative: the name is always next to it or in a label. */
@Component({
  selector: 'app-avatar',
  host: {
    class:
      'flex items-center justify-center size-7 shrink-0 rounded-full bg-accent-tint text-accent-ink text-[11px] leading-none font-medium',
    'aria-hidden': 'true',
  },
  template: '{{ initials() }}',
})
export class Avatar {
  readonly initials = input.required<string>();
}

import { Component, input } from '@angular/core';

/**
 * Says what is true, then offers one way forward: project a pill as the content.
 * Left-aligned, no illustration.
 */
@Component({
  selector: 'app-empty-state',
  host: { class: 'flex flex-col items-start gap-4 p-4 rounded-md border border-line bg-card' },
  template: `
    <div class="flex flex-col gap-2">
      <h2 class="text-title font-medium">{{ title() }}</h2>
      <p class="text-secondary">{{ text() }}</p>
    </div>
    <ng-content />
  `,
})
export class EmptyState {
  readonly title = input.required<string>();
  readonly text = input.required<string>();
}

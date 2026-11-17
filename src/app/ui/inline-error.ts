import { booleanAttribute, Component, input, output } from '@angular/core';
import { LucideRotateCw } from '@lucide/angular';
import { PillButton } from './pill-button';

/**
 * A panel that did not load: names it, says when it last worked if that is known, and offers
 * Retry. While retrying, the message is neutral and the button is disabled.
 */
@Component({
  selector: 'app-inline-error',
  imports: [LucideRotateCw, PillButton],
  host: {
    class: 'flex items-center justify-between gap-4 p-4 rounded-md border border-line bg-card',
    '[attr.role]': 'retrying() ? null : "alert"',
  },
  template: `
    <div class="flex flex-col gap-1">
      <span class="font-medium" [class.text-critical]="!retrying()">
        {{ retrying() ? retryingMessage() : message() }}
      </span>
      @if (detail(); as detail) {
        <span class="text-table text-secondary">{{ detail }}</span>
      }
    </div>
    <button
      type="button"
      appPillButton="secondary"
      class="shrink-0"
      [disabled]="retrying()"
      (click)="retry.emit()"
    >
      <svg lucideRotateCw class="size-4 shrink-0"></svg>
      <span>Retry</span>
    </button>
  `,
})
export class InlineError {
  readonly message = input.required<string>();
  /** Shown instead of the message while a retry is running. */
  readonly retryingMessage = input('Loading again.');
  readonly detail = input<string>();
  readonly retrying = input(false, { transform: booleanAttribute });
  readonly retry = output<void>();
}

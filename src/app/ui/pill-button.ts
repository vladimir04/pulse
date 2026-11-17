import { Component, input } from '@angular/core';

const VARIANTS = {
  /** Charcoal; at most one per view. */
  primary:
    'bg-ink text-white hover:bg-secondary disabled:bg-line disabled:text-muted disabled:cursor-not-allowed',
  secondary:
    'border border-line bg-card hover:bg-page disabled:bg-card disabled:text-muted disabled:cursor-not-allowed',
};

/**
 * The pill, on a `<button>` when it acts and on an `<a>` when it navigates. Put an icon next to
 * the label as a sibling; the gap is built in.
 */
@Component({
  selector: 'button[appPillButton], a[appPillButton]',
  host: {
    class:
      'flex items-center gap-2 h-8 px-4 rounded-full font-medium transition-colors duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-ink',
    '[class]': 'variants[variant()]',
  },
  template: '<ng-content />',
})
export class PillButton {
  /** `appPillButton="primary"`; the bare attribute is the secondary pill. */
  readonly variant = input('secondary', {
    alias: 'appPillButton',
    transform: (variant: keyof typeof VARIANTS | ''): keyof typeof VARIANTS =>
      variant || 'secondary',
  });

  protected readonly variants = VARIANTS;
}

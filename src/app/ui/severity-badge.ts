import { Component, input } from '@angular/core';
import type { Insight } from '@shared/types';

const SEVERITIES: Record<Insight['severity'], { label: string; class: string }> = {
  critical: { label: 'Critical', class: 'bg-critical-tint text-critical' },
  warning: { label: 'Warning', class: 'bg-warning-tint text-warning' },
  positive: { label: 'Positive', class: 'bg-positive-tint text-positive' },
  info: { label: 'Info', class: 'bg-info-tint text-info' },
};

/** How much an insight matters, in words: ink on tint. */
@Component({
  selector: 'app-severity-badge',
  host: {
    class: 'flex items-center h-6 px-2 rounded-md text-table font-medium',
    '[class]': 'severities[severity()].class',
  },
  template: '{{ severities[severity()].label }}',
})
export class SeverityBadge {
  readonly severity = input.required<Insight['severity']>();

  protected readonly severities = SEVERITIES;
}

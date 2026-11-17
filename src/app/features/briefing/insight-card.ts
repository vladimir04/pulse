import { Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideArrowRight, LucideChevronRight } from '@lucide/angular';
import type { Insight } from '@shared/types';
import { BarChart } from '../../ui/charts/bar-chart';
import { entityDotClass } from '../../ui/charts/chart-theme';
import { LineChart } from '../../ui/charts/line-chart';
import { EventChip } from '../../ui/event-chip';
import { SeverityBadge } from '../../ui/severity-badge';
import { formatDayMonth, formatDelta } from '../../util/format';
import { evidenceGroups } from './evidence';

const SEVERITY_TEXT: Record<Insight['severity'], string> = {
  critical: 'text-critical',
  warning: 'text-warning',
  positive: 'text-positive',
  info: 'text-info',
};
const CATEGORIES: Record<Insight['category'], string> = {
  profit: 'Profit',
  bookings: 'Bookings',
  restaurant: 'Restaurant',
  channels: 'Channels',
  staffing: 'Staffing',
};
const CHANGE_TEXT = { better: 'text-positive', worse: 'text-critical', flat: 'text-info' };

/**
 * One finding: how much it matters and the change, the headline, why it happened and what to
 * do, the evidence (closed until asked for), and a small chart. "View in Explore" is a link;
 * the page decides what Explore should show when it is followed.
 */
@Component({
  selector: 'app-insight-card',
  imports: [
    BarChart,
    EventChip,
    LineChart,
    LucideArrowRight,
    LucideChevronRight,
    RouterLink,
    SeverityBadge,
  ],
  host: { class: 'contents' },
  templateUrl: './insight-card.html',
})
export class InsightCard {
  readonly insight = input.required<Insight>();
  /** "View in Explore" was followed. */
  readonly explore = output<Insight>();

  protected readonly severityText = SEVERITY_TEXT;
  protected readonly changeText = CHANGE_TEXT;
  protected readonly dotClass = entityDotClass;
  protected readonly formatDayMonth = formatDayMonth;

  protected readonly delta = computed(() => {
    const { value, unit } = this.insight().delta;
    return formatDelta(value, unit);
  });
  /** What the finding is about and the period it covers, for example "Profit · October 2026". */
  protected readonly context = computed(() => {
    const { category, period } = this.insight();
    return `${CATEGORIES[category]} · ${period.label.charAt(0).toUpperCase()}${period.label.slice(1)}`;
  });
  protected readonly evidence = computed(() => evidenceGroups(this.insight().evidence));
  protected readonly evidenceCount = computed(() =>
    this.evidence().reduce((count, group) => count + group.rows.length, 0),
  );
  /** The chart is one image to a screen reader: what it shows, its series, and the finding. */
  protected readonly chartLabel = computed(() => {
    const { chart, headline } = this.insight();
    return `${chart.title}: ${chart.series.map((series) => series.name).join(', ')}. ${headline}`;
  });
  /** Bars need a key when there is more than one series; lines are named at their ends. */
  protected readonly legend = computed(() => {
    const { series } = this.insight().chart;
    return this.insight().chart.type === 'bar' && series.length > 1 ? series : [];
  });
}

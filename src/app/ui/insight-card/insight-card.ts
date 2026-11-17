import { NgTemplateOutlet } from '@angular/common';
import { booleanAttribute, Component, computed, input, output } from '@angular/core';
import { LucideArrowRight, LucideChevronRight } from '@lucide/angular';
import type { AnswerCard, ChartSpec, DeltaUnit, Event, Insight } from '@shared/types';
import { BarChart } from '../charts/bar-chart';
import { entityDotClass } from '../charts/chart-theme';
import { LineChart } from '../charts/line-chart';
import { EventChip } from '../event-chip';
import { SeverityBadge } from '../severity-badge';
import { formatDayMonth, formatDelta } from '../../util/format';

/** One figure behind a finding, with last year and the change where they were compared. */
export interface EvidenceRow {
  label: string;
  value: string;
  lastYear: string;
  change?: { text: string; tone: 'better' | 'worse' | 'flat' };
}

/** The rows one query returned, under the query as it was asked. */
export interface EvidenceGroup {
  query: string;
  rows: EvidenceRow[];
}

/** Everything a card shows. A finding of the Briefing and an answer of Ask both fit. */
export interface InsightCardData {
  headline: string;
  cause: string;
  nextMove: string;
  severity?: Insight['severity'];
  /** The change the finding is about, in the severity's colour */
  delta?: { value: number; unit: DeltaUnit };
  /** What the finding is about and the period it covers, for example "Profit · October 2026" */
  context?: string;
  confidence?: AnswerCard['confidence'];
  chart?: ChartSpec;
  /** The dated causes, shown as chips after the cause */
  events?: Event[];
  evidence: {
    /** How much there is, shown while closed: "33 items", "4 tool calls" */
    summary: string;
    /** A table of figures, one group per query */
    groups?: EvidenceGroup[];
    /** Or one line per tool call */
    lines?: string[];
  };
  /** Questions that take the answer further, offered as chips */
  followUps?: string[];
}

const SEVERITY_TEXT: Record<Insight['severity'], string> = {
  critical: 'text-critical',
  warning: 'text-warning',
  positive: 'text-positive',
  info: 'text-info',
};
const CONFIDENCE: Record<AnswerCard['confidence'], string> = {
  high: 'High confidence',
  medium: 'Medium confidence',
  low: 'Low confidence',
};
const CHANGE_TEXT = { better: 'text-positive', worse: 'text-critical', flat: 'text-info' };

/**
 * One finding or answer: how much it matters and the change, the headline, why it happened and
 * what to do, the evidence, and a small chart. `wide` is the Briefing's row with the chart on
 * the right; `stacked` is one column for the Ask drawer, and `compact` cuts that down to the
 * headline and its evidence. The card only reports what was clicked; the page acts on it.
 */
@Component({
  selector: 'app-insight-card',
  imports: [
    BarChart,
    EventChip,
    LineChart,
    LucideArrowRight,
    LucideChevronRight,
    NgTemplateOutlet,
    SeverityBadge,
  ],
  host: { class: 'contents' },
  templateUrl: './insight-card.html',
})
export class InsightCard {
  readonly card = input.required<InsightCardData>();
  readonly layout = input<'wide' | 'stacked'>('wide');
  /** Stacked only: the tags, the headline and the evidence in a line. */
  readonly compact = input(false, { transform: booleanAttribute });
  /** Offer "Ask about this". */
  readonly canAsk = input(false, { transform: booleanAttribute });
  /** Offer "View in Explore". */
  readonly canExplore = input(false, { transform: booleanAttribute });

  readonly viewInExplore = output<void>();
  readonly askAboutThis = output<void>();
  /** A follow-up question was picked. */
  readonly followUp = output<string>();

  protected readonly changeText = CHANGE_TEXT;
  protected readonly dotClass = entityDotClass;
  protected readonly formatDayMonth = formatDayMonth;

  protected readonly delta = computed(() => {
    const delta = this.card().delta;
    return delta && formatDelta(delta.value, delta.unit);
  });
  protected readonly deltaColour = computed(() => {
    const severity = this.card().severity;
    return severity ? SEVERITY_TEXT[severity] : 'text-ink';
  });
  protected readonly confidence = computed(() => {
    const confidence = this.card().confidence;
    return confidence && CONFIDENCE[confidence];
  });
  /** The chart is one image to a screen reader: what it shows, its series, and the finding. */
  protected readonly chartLabel = computed(() => {
    const { chart, headline } = this.card();
    if (!chart) return '';
    return `${chart.title}: ${chart.series.map((series) => series.name).join(', ')}. ${headline}`;
  });
  /** Bars need a key when there is more than one series; lines are named at their ends. */
  protected readonly legend = computed(() => {
    const chart = this.card().chart;
    return chart?.type === 'bar' && chart.series.length > 1 ? chart.series : [];
  });
}

import { CdkTrapFocus } from '@angular/cdk/a11y';
import { Component, computed, DOCUMENT, effect, inject } from '@angular/core';
import { LucideChevronRight, LucideX } from '@lucide/angular';
import type { AnswerCard } from '@shared/types';
import { InlineError } from '../../../ui/inline-error';
import { InsightCard, type InsightCardData } from '../../../ui/insight-card/insight-card';
import { Skeleton } from '../../../ui/skeleton';
import { formatRange } from '../../../util/format';
import { type Answered, AskService } from '../../ask/ask.service';
import { HotelContextService } from '../../context/hotel-context.service';

/** Offered while nothing has been asked yet. */
const SUGGESTIONS = [
  'Are we selling enough rooms for next month?',
  'Is our restaurant pulling its weight?',
  'Which booking channel is actually most profitable once costs are counted?',
  'Why is October’s profit down?',
];

const DAY_MS = 86_400_000;
const isDate = (value: unknown): value is string =>
  typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);

/**
 * A tool call as one line of evidence: tool, hotel, what was measured, period. A period that
 * ends today reads as people say it, "last 90 days".
 */
function evidenceLine({ name, input }: AnswerCard['evidence'][number], asOf?: string): string {
  const [from, to] = [input['from'] ?? input['stayFrom'], input['to'] ?? input['stayTo']];
  let period: string | undefined;
  if (isDate(from) && isDate(to)) {
    const days = Math.round((Date.parse(to) - Date.parse(from)) / DAY_MS) + 1;
    period =
      to === asOf && (days === 30 || days === 90) ? `last ${days} days` : formatRange({ from, to });
  }
  return [name, input['hotelId'], input['metric'], period]
    .filter((part) => typeof part === 'string' && part !== '')
    .join(' · ');
}

/** An answer as the insight card shows it. */
function toCard(answer: Answered, asOf?: string): InsightCardData {
  const calls = answer.evidence.length;
  return {
    headline: answer.headline,
    cause: answer.cause,
    nextMove: answer.nextMove,
    confidence: answer.confidence,
    chart: answer.chart,
    followUps: answer.followUps,
    evidence: {
      summary: `${calls} ${calls === 1 ? 'tool call' : 'tool calls'}`,
      lines: answer.evidence.map((call) => evidenceLine(call, asOf)),
    },
  };
}

/**
 * Ask: a question about the hotel's numbers, answered as an insight card. The shell hosts it
 * once. It opens from the top bar's Ask pill, from ⌘K or Ctrl+K anywhere, and from "Ask about
 * this" on an insight; Escape closes it and focus goes back to whatever opened it.
 */
@Component({
  selector: 'app-ask-drawer',
  imports: [CdkTrapFocus, InlineError, InsightCard, LucideChevronRight, LucideX, Skeleton],
  host: { '(document:keydown)': 'onKeydown($event)' },
  templateUrl: './ask-drawer.html',
})
export class AskDrawer {
  protected readonly ask = inject(AskService);
  private readonly hotelContext = inject(HotelContextService);

  protected readonly suggestions = SUGGESTIONS;

  /** The hotel and period the answer will use. */
  protected readonly contextLine = computed(() => {
    const context = this.ask.context();
    if (!context) return '';
    const hotel = this.hotelContext.hotels().find((candidate) => candidate.id === context.hotelId);
    return [hotel?.name, context.period && formatRange(context.period)].filter(Boolean).join(' · ');
  });

  private readonly cards = computed(() =>
    this.ask.history().map((answer) => ({
      question: answer.question,
      card: toCard(answer, this.hotelContext.asOf()),
    })),
  );
  /** The answer to the last question, while it is the one on top. */
  protected readonly current = computed(() =>
    this.ask.status() === 'answered' ? this.cards()[0] : undefined,
  );
  /** Everything answered before what is on top. */
  protected readonly earlier = computed(() => this.cards().slice(this.current() ? 1 : 0));

  constructor() {
    // The page behind does not scroll while the drawer is open.
    const root = inject(DOCUMENT).documentElement;
    effect(() => root.classList.toggle('overflow-hidden', this.ask.isOpen()));
  }

  protected onKeydown(event: KeyboardEvent): void {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      if (this.ask.isOpen()) this.ask.close();
      else this.ask.open();
    } else if (event.key === 'Escape' && this.ask.isOpen()) {
      this.ask.close();
    }
  }

  protected submit(event: Event): void {
    event.preventDefault();
    void this.ask.ask(this.ask.question());
  }
}

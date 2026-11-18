import { effect, inject, Injectable, signal } from '@angular/core';
import type { AnswerCard, HotelId, Period } from '@shared/types';
import { ApiService } from '../api/api.service';
import { AuthService } from '../auth/auth.service';
import { HotelContextService } from '../context/hotel-context.service';

/** The hotel and period a question is asked about. */
export interface AskContext {
  hotelId: HotelId;
  period: Period | undefined;
}

/** What an insight hands over when it opens the drawer: a question about it, and where it applies. */
export interface AskPrefill {
  question: string;
  hotelId: HotelId;
  period: Period;
}

/** An answer, with the question that got it. */
export interface Answered extends AnswerCard {
  question: string;
}

export type AskStatus = 'idle' | 'loading' | 'answered' | 'error';

/**
 * The Ask drawer's state: whether it is open, what is typed, what the answer will be about,
 * and the answers so far. Every opening starts empty, so an answer is only ever shown under
 * the hotel and period it was asked about, and to the user who asked.
 */
@Injectable({ providedIn: 'root' })
export class AskService {
  private readonly api = inject(ApiService);
  private readonly hotelContext = inject(HotelContextService);

  readonly isOpen = signal(false);
  /** What is in the field. */
  readonly question = signal('');
  /** What the next answer will be about; set each time the drawer opens. */
  readonly context = signal<AskContext | undefined>(undefined);
  /** The answers since the drawer was opened, newest first. */
  readonly history = signal<Answered[]>([]);
  readonly status = signal<AskStatus>('idle');
  /** The question being answered, or the one that failed. */
  readonly asked = signal<string | undefined>(undefined);

  /** Counts the times the drawer started afresh; an answer asked for before the last one is dropped. */
  private generation = 0;

  constructor() {
    // One user's answers are not shown to the next.
    const auth = inject(AuthService);
    effect(() => {
      if (!auth.user()) this.reset();
    });
  }

  /**
   * Opens empty, on the hotel and period on screen, or on an insight's with a question about it.
   * Earlier answers and anything left in the field belong to the last opening and are dropped.
   */
  open(prefill?: AskPrefill): void {
    this.clear();
    this.context.set(
      prefill
        ? { hotelId: prefill.hotelId, period: prefill.period }
        : { hotelId: this.hotelContext.hotelId(), period: this.hotelContext.period() },
    );
    if (prefill) this.question.set(prefill.question);
    this.isOpen.set(true);
  }

  close(): void {
    this.isOpen.set(false);
  }

  /** Asks about the current context. The field clears; the answer goes to the top of the history. */
  async ask(question: string): Promise<void> {
    const text = question.trim();
    const context = this.context();
    if (!text || !context || this.status() === 'loading') return;

    this.question.set('');
    this.asked.set(text);
    this.status.set('loading');
    const generation = this.generation;
    try {
      const { answer } = await this.api.ask({
        question: text,
        hotelId: context.hotelId,
        period: context.period,
      });
      // The drawer has started afresh since: this answer belongs to what was cleared.
      if (generation !== this.generation) return;
      this.history.update((history) => [{ ...answer, question: text }, ...history]);
      this.status.set('answered');
    } catch {
      if (generation === this.generation) this.status.set('error');
    }
  }

  /** Asks the question that failed again. */
  retry(): void {
    void this.ask(this.asked() ?? '');
  }

  /** Forgets the answers, the question in the field and any answer still on its way. */
  private clear(): void {
    this.generation++;
    this.question.set('');
    this.history.set([]);
    this.status.set('idle');
    this.asked.set(undefined);
  }

  private reset(): void {
    this.isOpen.set(false);
    this.clear();
  }
}

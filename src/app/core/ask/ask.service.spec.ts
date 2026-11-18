import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import type { AnswerCard } from '@shared/types';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mark } from '../../testing/fixtures';
import { AuthService } from '../auth/auth.service';
import { AskService } from './ask.service';

const answer: AnswerCard = {
  headline: 'Profit fell 13.7% in October.',
  cause: 'Occupancy fell after the rate rise.',
  nextMove: 'Revisit the rate increase.',
  confidence: 'high',
  followUps: ['Compare with last year'],
  evidence: [{ name: 'get_kpis', input: { hotelId: 'hotel-central' } }],
};
const marinaInOctober = {
  question: 'Why did the net rate fall?',
  hotelId: 'marina-resort',
  period: { from: '2026-10-01', to: '2026-10-31' },
} as const;

describe('AskService', () => {
  let ask: AskService;
  let http: HttpTestingController;

  /** Answers the question that is waiting. */
  const answerArrives = (): void => http.expectOne('/api/ask').flush({ answer, usage: {} });

  beforeEach(() => {
    localStorage.setItem('pulse.user', JSON.stringify(mark));
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    http = TestBed.inject(HttpTestingController);
    ask = TestBed.inject(AskService);
  });

  it('keeps the answers while the drawer stays open', async () => {
    ask.open();
    const asking = ask.ask('Why is profit down?');
    answerArrives();
    await asking;

    expect(ask.status()).toBe('answered');
    expect(ask.history().map((entry) => entry.question)).toEqual(['Why is profit down?']);
  });

  it('opens empty every time, on the hotel and period it was opened for', async () => {
    ask.open();
    const asking = ask.ask('Why is profit down?');
    answerArrives();
    await asking;
    ask.question.set('a question left half typed');
    ask.close();

    ask.open(marinaInOctober);

    expect(ask.history()).toEqual([]);
    expect(ask.status()).toBe('idle');
    expect(ask.question()).toBe('Why did the net rate fall?');
    expect(ask.context()).toEqual({
      hotelId: 'marina-resort',
      period: { from: '2026-10-01', to: '2026-10-31' },
    });
  });

  it('drops an answer that arrives after the drawer was opened again', async () => {
    ask.open();
    const asking = ask.ask('Why is profit down?');
    ask.close();
    ask.open(marinaInOctober);

    answerArrives();
    await asking;

    expect(ask.history()).toEqual([]);
    expect(ask.status()).toBe('idle');
  });

  it('drops an answer that arrives after its user signed out', async () => {
    vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    ask.open();
    const asking = ask.ask('Why is profit down?');

    TestBed.inject(AuthService).logout();
    TestBed.tick();
    answerArrives();
    await asking;

    expect(ask.isOpen()).toBe(false);
    expect(ask.history()).toEqual([]);
  });
});

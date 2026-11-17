import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { text } from '../../testing/helpers';
import { BriefingHeader } from './briefing-header';

describe('BriefingHeader', () => {
  let fixture: ComponentFixture<BriefingHeader>;

  const header = (): HTMLElement => fixture.nativeElement;
  const eyebrow = (): string => text(header().querySelector('p'));
  const headline = (): string => text(header().querySelector('h1'));

  /** Mark's briefing for Hotel Central on a morning, with whatever a spec changes. */
  async function show(changes: Record<string, unknown> = {}): Promise<void> {
    const inputs = {
      greeting: 'Morning',
      firstName: 'Mark',
      date: '2026-11-17',
      hotelName: 'Hotel Central Brussels',
      state: 'ready',
      ...changes,
    };
    for (const [name, value] of Object.entries(inputs)) fixture.componentRef.setInput(name, value);
    await fixture.whenStable();
  }

  beforeEach(() => {
    fixture = TestBed.createComponent(BriefingHeader);
  });

  it('greets the user and shows the period beside the headline', async () => {
    await show({ periodLabel: '1–17 Nov 2026' });

    expect(eyebrow()).toBe('Morning, Mark');
    expect(text(header())).toContain('1–17 Nov 2026');
  });

  it.each([
    [4, '4 things need attention at Hotel Central Brussels'],
    [1, '1 thing needs attention at Hotel Central Brussels'],
    [0, 'Everything is within normal range at Hotel Central Brussels'],
  ])('with %i findings that need attention, says: %s', async (attention, expected) => {
    await show({ attention });

    expect(headline()).toBe(expected);
  });

  it('holds a placeholder where the headline will be while loading', async () => {
    await show({ state: 'loading' });

    expect(headline()).toBe('Loading today’s briefing');
    expect(header().querySelector('h1 app-skeleton')).not.toBeNull();
  });

  it('names only the hotel when the insights did not load', async () => {
    await show({ state: 'failed', attention: 0 });

    expect(headline()).toBe('Hotel Central Brussels');
  });
});

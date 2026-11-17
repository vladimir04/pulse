import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { stubCharts, text } from '../../testing/helpers';
import { InsightCard, type InsightCardData } from './insight-card';

/** A finding as the Briefing shows it. */
const finding: InsightCardData = {
  headline: 'Profit in October 2026 was 13.7% lower than a year earlier.',
  cause: 'Occupancy fell 8.7 points and rooms staffing cost rose 29.4%.',
  nextMove: 'Revisit the rate increase.',
  severity: 'critical',
  delta: { value: -13.7, unit: 'percent' },
  context: 'Profit · October 2026',
  chart: {
    type: 'bar',
    title: 'Revenue and profit',
    unit: 'currency',
    x: ['Revenue', 'Profit'],
    series: [
      { name: 'Last year', role: 'lastYear', data: [1_100_000, 344_173] },
      { name: 'This year', role: 'current', data: [1_105_000, 296_853] },
    ],
  },
  events: [
    {
      hotelId: 'hotel-central',
      date: '2026-09-28',
      kind: 'rate_change',
      title: 'Published rate +15% for October',
      label: 'Published rate +15%',
      detail: 'The published rate went up 15% for the trade-fair season.',
    },
  ],
  evidence: {
    summary: '2 items',
    groups: [
      {
        query: 'get_kpis(hotelId: hotel-central, from: 2026-10-01, to: 2026-10-31)',
        rows: [
          {
            label: 'Occupancy',
            value: '68.2%',
            lastYear: '76.9%',
            change: { text: '−8.7 pts', tone: 'worse' },
          },
          { label: 'Rooms sold', value: '3,805', lastYear: '—' },
        ],
      },
    ],
  },
};

/** An answer as the Ask drawer shows it. */
const answer: InsightCardData = {
  headline: 'Direct website keeps the most per room night.',
  cause: 'Booking.com takes 18% of each booking.',
  nextMove: 'Move bookings to the direct website.',
  confidence: 'high',
  evidence: {
    summary: '1 tool call',
    lines: ['get_channel_performance · marina-resort · last 90 days'],
  },
  followUps: ['Compare with last year', 'Show by week'],
};

describe('InsightCard', () => {
  let fixture: ComponentFixture<InsightCard>;

  const card = (): HTMLElement => fixture.nativeElement;
  const button = (label: string): HTMLButtonElement | undefined =>
    [...card().querySelectorAll('button')].find((candidate) => text(candidate) === label);

  async function show(data: InsightCardData, inputs: Record<string, unknown> = {}): Promise<void> {
    fixture = TestBed.createComponent(InsightCard);
    fixture.componentRef.setInput('card', data);
    for (const [name, value] of Object.entries(inputs)) fixture.componentRef.setInput(name, value);
    await fixture.whenStable();
  }

  beforeEach(() => {
    stubCharts(InsightCard);
  });

  it('says how much the finding matters, what changed and by how much', async () => {
    await show(finding);

    expect(text(card().querySelector('app-severity-badge'))).toBe('Critical');
    expect(text(card().querySelector('h2'))).toBe(finding.headline);
    expect(text(card())).toContain('−13.7%');
    expect(text(card())).toContain('Profit · October 2026');
  });

  it('gives the cause with the events behind it, and the next move', async () => {
    await show(finding);

    expect(text(card())).toContain(finding.cause);
    expect(text(card().querySelector('app-event-chip'))).toContain(
      'Published rate +15% for October',
    );
    expect(text(card().querySelector('app-event-chip'))).toContain('28 Sep');
    expect(text(card())).toContain('Revisit the rate increase.');
  });

  it('keeps the evidence table closed until asked for, and says how much there is', async () => {
    await show(finding);

    const evidence = card().querySelector('details')!;
    expect(evidence.open).toBe(false);
    expect(text(evidence.querySelector('summary'))).toBe('2 items');
    expect(text(evidence.querySelector('th[scope=rowgroup]'))).toBe(
      'get_kpis(hotelId: hotel-central, from: 2026-10-01, to: 2026-10-31)',
    );
    expect([...evidence.querySelectorAll('th[scope=row]')].map(text)).toEqual([
      'Occupancy',
      'Rooms sold',
    ]);
  });

  it('draws bars with a key, and describes the chart in words', async () => {
    await show(finding);

    expect(card().querySelector('app-line-chart')).toBeNull();
    expect(card().querySelector('app-bar-chart')!.getAttribute('aria-label')).toBe(
      'Revenue and profit: Last year, This year. Profit in October 2026 was 13.7% lower than a year earlier.',
    );
    expect(text(card().querySelector('figure'))).toContain('Last year');
  });

  it('draws a line when the finding is about a change over time', async () => {
    await show({
      ...finding,
      chart: {
        type: 'line',
        title: 'Monday–Thursday capture rate',
        unit: 'percent',
        x: ['2026-08-31', '2026-09-07'],
        series: [{ name: 'Capture rate', role: 'current', data: [43.1, 33.9] }],
      },
    });

    expect(card().querySelector('app-line-chart')).not.toBeNull();
    expect(card().querySelector('app-bar-chart')).toBeNull();
  });

  it('reports "Ask about this" and "View in Explore" and leaves the rest to the page', async () => {
    await show(finding, { canAsk: true, canExplore: true });
    const clicked: string[] = [];
    fixture.componentInstance.askAboutThis.subscribe(() => clicked.push('ask'));
    fixture.componentInstance.viewInExplore.subscribe(() => clicked.push('explore'));

    button('Ask about this')!.click();
    button('View in Explore')!.click();

    expect(clicked).toEqual(['ask', 'explore']);
  });

  it('offers no actions unless asked to', async () => {
    await show(finding);

    expect(button('Ask about this')).toBeUndefined();
    expect(button('View in Explore')).toBeUndefined();
  });

  it('stacks an answer in one column, with its confidence and tool calls', async () => {
    await show(answer, { layout: 'stacked' });

    expect(text(card())).toContain('High confidence');
    expect(card().querySelector('app-severity-badge')).toBeNull();
    expect(card().querySelector('figure')).toBeNull();
    expect(card().querySelector('details')!.open).toBe(true);
    expect(text(card().querySelector('summary'))).toBe('1 tool call');
    expect([...card().querySelectorAll('details li')].map(text)).toEqual([
      'get_channel_performance · marina-resort · last 90 days',
    ]);
  });

  it('asks a follow-up question when its chip is picked', async () => {
    await show(answer, { layout: 'stacked' });
    const asked: string[] = [];
    fixture.componentInstance.followUp.subscribe((question) => asked.push(question));

    button('Show by week')!.click();

    expect(asked).toEqual(['Show by week']);
  });

  it('cuts an earlier answer down to its headline and evidence', async () => {
    await show(answer, { layout: 'stacked', compact: true });

    expect(text(card().querySelector('h2'))).toBe(answer.headline);
    expect(text(card())).toContain('get_channel_performance · marina-resort · last 90 days');
    expect(text(card())).not.toContain(answer.cause);
    expect(button('Show by week')).toBeUndefined();
  });
});

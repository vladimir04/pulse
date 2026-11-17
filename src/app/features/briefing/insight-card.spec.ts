import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { Insight } from '@shared/types';
import { beforeEach, describe, expect, it } from 'vitest';
import { insight } from '../../testing/fixtures';
import { BlankPage, stubCharts, text } from '../../testing/helpers';
import { InsightCard } from './insight-card';

describe('InsightCard', () => {
  let fixture: ComponentFixture<InsightCard>;

  const card = (): HTMLElement => fixture.nativeElement;

  async function show(finding: Insight): Promise<void> {
    fixture = TestBed.createComponent(InsightCard);
    fixture.componentRef.setInput('insight', finding);
    await fixture.whenStable();
  }

  beforeEach(() => {
    stubCharts(InsightCard);
    TestBed.configureTestingModule({
      providers: [provideRouter([{ path: '**', component: BlankPage }])],
    });
  });

  it('says how much the finding matters, what changed and by how much', async () => {
    await show(insight());

    expect(text(card().querySelector('app-severity-badge'))).toBe('Critical');
    expect(text(card().querySelector('h2'))).toBe(
      'Profit in October 2026 was 13.7% lower than a year earlier.',
    );
    expect(text(card())).toContain('−13.7%');
    expect(text(card())).toContain('Profit · October 2026');
  });

  it('gives the cause with the events behind it, and the next move', async () => {
    await show(insight());

    expect(text(card())).toContain('Occupancy fell 8.7 points and rooms staffing cost rose 29.4%.');
    expect(text(card().querySelector('app-event-chip'))).toContain(
      'Published rate +15% for October',
    );
    expect(text(card().querySelector('app-event-chip'))).toContain('28 Sep');
    expect(text(card())).toContain('Revisit the rate increase.');
  });

  it('keeps the evidence closed until asked for, and says how much there is', async () => {
    await show(insight());

    const evidence = card().querySelector('details')!;
    expect(evidence.open).toBe(false);
    expect(text(evidence.querySelector('summary'))).toBe('2 items');
    expect(text(evidence.querySelector('th[scope=rowgroup]'))).toBe(
      'get_kpis(hotelId: hotel-central, from: 2026-10-01, to: 2026-10-31)',
    );
    expect([...evidence.querySelectorAll('th[scope=row]')].map(text)).toEqual([
      'Occupancy',
      'Operating profit',
    ]);
  });

  it('draws bars with a key, and describes the chart in words', async () => {
    await show(insight());

    const chart = card().querySelector('app-bar-chart')!;
    expect(card().querySelector('app-line-chart')).toBeNull();
    expect(chart.getAttribute('aria-label')).toBe(
      'Revenue and profit: Last year, This year. Profit in October 2026 was 13.7% lower than a year earlier.',
    );
    expect(text(card().querySelector('figure'))).toContain('Last year');
    expect(text(card().querySelector('figure'))).toContain('This year');
  });

  it('draws a line when the finding is about a change over time', async () => {
    await show(
      insight({
        chart: {
          type: 'line',
          title: 'Monday–Thursday capture rate',
          unit: 'percent',
          x: ['2026-08-31', '2026-09-07'],
          series: [{ name: 'Capture rate', role: 'current', data: [43.1, 33.9] }],
        },
      }),
    );

    expect(card().querySelector('app-line-chart')).not.toBeNull();
    expect(card().querySelector('app-bar-chart')).toBeNull();
    expect(text(card().querySelector('figcaption'))).toBe('Monday–Thursday capture rate');
  });

  it('tells the page which finding to open when View in Explore is followed', async () => {
    const finding = insight();
    await show(finding);
    const followed: Insight[] = [];
    fixture.componentInstance.explore.subscribe((opened) => followed.push(opened));

    const link = [...card().querySelectorAll('a')].find(
      (candidate) => text(candidate) === 'View in Explore',
    )!;
    link.click();
    await fixture.whenStable();

    expect(link.getAttribute('href')).toBe('/explore');
    expect(followed).toEqual([finding]);
  });
});

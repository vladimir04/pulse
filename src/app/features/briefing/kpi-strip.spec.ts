import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { kpis } from '../../testing/fixtures';
import { text } from '../../testing/helpers';
import { KpiStrip } from './kpi-strip';

describe('KpiStrip', () => {
  let fixture: ComponentFixture<KpiStrip>;

  const strip = (): HTMLElement => fixture.nativeElement;
  /** Each tile as label, value and the change against last year. */
  const tiles = (): string[][] =>
    [...strip().querySelectorAll('app-kpi-tile')].map((tile) => [
      text(tile.querySelector('button')),
      text(tile.querySelector('.text-kpi')),
      text(tile.querySelector('app-delta-chip')),
    ]);

  beforeEach(() => {
    fixture = TestBed.createComponent(KpiStrip);
  });

  it('holds five placeholders until the figures arrive', async () => {
    await fixture.whenStable();

    expect(strip().querySelector('section')!.getAttribute('aria-label')).toBe(
      'Key figures, loading',
    );
    expect(tiles()).toEqual([]);
    expect(strip().querySelectorAll('app-skeleton').length).toBe(15);
  });

  it('shows the five key figures with their change against last year', async () => {
    fixture.componentRef.setInput('kpis', kpis);
    await fixture.whenStable();

    expect(strip().querySelector('section')!.getAttribute('aria-label')).toBe('Key figures');
    expect(tiles()).toEqual([
      ['Occupancy', '79.3%', '+2.5 pts'],
      ['ADR', '€156', '+3.8%'],
      ['RevPAR', '€124', '+7.2%'],
      ['NetPAR', '€113', '+7.1%'],
      ['Operating profit', '€157.2k', '+12.8%'],
    ]);
  });

  it('shows the period under each figure when the comparison is off', async () => {
    fixture.componentRef.setInput('kpis', kpis);
    fixture.componentRef.setInput('compare', false);
    fixture.componentRef.setInput('caption', '1–17 Nov 2026');
    await fixture.whenStable();

    expect(strip().querySelectorAll('app-delta-chip').length).toBe(0);
    expect(text(strip()).match(/1–17 Nov 2026/g)).toHaveLength(5);
  });
});

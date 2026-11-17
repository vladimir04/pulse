import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { text } from '../testing/helpers';
import { KpiTile } from './kpi-tile';

describe('KpiTile', () => {
  let fixture: ComponentFixture<KpiTile>;

  const tile = (): HTMLElement => fixture.nativeElement;
  const tooltip = (): HTMLElement | null => document.querySelector('[role=tooltip]');

  /** The occupancy tile, with whatever a spec changes. */
  async function show(changes: Record<string, unknown> = {}): Promise<void> {
    const inputs = { label: 'Occupancy', value: 79.3, unit: 'percent', ...changes };
    for (const [name, value] of Object.entries(inputs)) fixture.componentRef.setInput(name, value);
    await fixture.whenStable();
  }

  beforeEach(() => {
    fixture = TestBed.createComponent(KpiTile);
  });

  it('shows the figure in its unit with the change against last year', async () => {
    await show({ delta: { value: 2.5, unit: 'points' } });

    expect(text(tile())).toContain('Occupancy');
    expect(text(tile().querySelector('.text-kpi'))).toBe('79.3%');
    expect(text(tile().querySelector('app-delta-chip'))).toBe('+2.5 pts');
    expect(text(tile())).toContain('vs last year');
  });

  it('shows the caption when there is nothing to compare with', async () => {
    await show({ label: 'ADR', value: 156.2, unit: 'currency', caption: '1–17 Nov 2026' });

    expect(text(tile().querySelector('.text-kpi'))).toBe('€156');
    expect(tile().querySelector('app-delta-chip')).toBeNull();
    expect(text(tile())).toContain('1–17 Nov 2026');
  });

  it('explains the label on focus and puts the explanation away on Escape', async () => {
    await show({
      tooltip: { title: 'Occupancy', text: 'The share of the rooms that were sold.' },
    });
    const label = tile().querySelector('button')!;
    expect(tooltip()).toBeNull();

    label.dispatchEvent(new Event('focus'));
    await fixture.whenStable();
    expect(text(tooltip())).toContain('The share of the rooms that were sold.');
    expect(label.getAttribute('aria-describedby')).toBe(tooltip()!.id);

    label.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await fixture.whenStable();
    expect(tooltip()).toBeNull();
    expect(label.hasAttribute('aria-describedby')).toBe(false);
  });
});

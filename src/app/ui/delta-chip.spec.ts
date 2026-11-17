import { type ComponentFixture, TestBed } from '@angular/core/testing';
import type { DeltaUnit } from '@shared/types';
import { beforeEach, describe, expect, it } from 'vitest';
import { text } from '../testing/helpers';
import { DeltaChip } from './delta-chip';

describe('DeltaChip', () => {
  let fixture: ComponentFixture<DeltaChip>;

  /** The chip for a change, where `goodDirection` says which way is good news. */
  async function chip(
    value: number,
    unit: DeltaUnit,
    goodDirection: 'up' | 'down' = 'up',
  ): Promise<HTMLElement> {
    fixture.componentRef.setInput('value', value);
    fixture.componentRef.setInput('unit', unit);
    fixture.componentRef.setInput('goodDirection', goodDirection);
    await fixture.whenStable();
    return fixture.nativeElement;
  }

  beforeEach(() => {
    fixture = TestBed.createComponent(DeltaChip);
  });

  it('always writes the sign, so the colour is never the only signal', async () => {
    expect(text(await chip(2.5, 'points'))).toBe('+2.5 pts');
    expect(text(await chip(-13.7, 'percent'))).toBe('−13.7%');
  });

  it('colours a rise as good news for a metric that should go up', async () => {
    expect((await chip(12.8, 'percent')).className).toContain('text-positive');
    expect((await chip(-12.8, 'percent')).className).toContain('text-critical');
  });

  it('colours a rise as bad news for a metric that should go down', async () => {
    expect((await chip(30.3, 'percent', 'down')).className).toContain('text-critical');
    expect((await chip(-30.3, 'percent', 'down')).className).toContain('text-positive');
  });

  it('reads a change under one as about the same', async () => {
    expect((await chip(-0.4, 'points')).className).toContain('text-info');
  });
});

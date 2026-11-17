import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { text } from '../testing/helpers';
import { InlineError } from './inline-error';

describe('InlineError', () => {
  let fixture: ComponentFixture<InlineError>;

  const panel = (): HTMLElement => fixture.nativeElement;
  const retry = (): HTMLButtonElement => panel().querySelector('button')!;

  beforeEach(async () => {
    fixture = TestBed.createComponent(InlineError);
    fixture.componentRef.setInput('message', 'Today’s insights did not load.');
    fixture.componentRef.setInput('retryingMessage', 'Loading today’s insights again.');
    fixture.componentRef.setInput('detail', 'The figures above are up to date.');
    await fixture.whenStable();
  });

  it('announces what did not load and offers a retry', () => {
    let retries = 0;
    fixture.componentInstance.retry.subscribe(() => retries++);

    expect(panel().getAttribute('role')).toBe('alert');
    expect(text(panel())).toContain('Today’s insights did not load.');
    expect(text(panel())).toContain('The figures above are up to date.');

    retry().click();
    expect(retries).toBe(1);
  });

  it('stops being an alert and disables the button while it retries', async () => {
    fixture.componentRef.setInput('retrying', true);
    await fixture.whenStable();

    expect(panel().hasAttribute('role')).toBe(false);
    expect(text(panel())).toContain('Loading today’s insights again.');
    expect(text(panel())).not.toContain('did not load');
    expect(retry().disabled).toBe(true);
  });
});

import { signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
import { mark } from '../../testing/fixtures';
import { text } from '../../testing/helpers';
import { AuthService } from '../auth/auth.service';
import { Sidebar } from './sidebar';

const STORAGE_KEY = 'pulse.sidebar';

describe('Sidebar', () => {
  let fixture: ComponentFixture<Sidebar>;

  const nav = (): HTMLElement => fixture.nativeElement.querySelector('nav');
  const links = (): string[] =>
    [...nav().querySelectorAll('a')].map((link) => link.getAttribute('href')!);

  async function open(): Promise<void> {
    fixture = TestBed.createComponent(Sidebar);
    await fixture.whenStable();
  }

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthService, useValue: { user: signal(mark) } }],
    });
  });

  it('starts expanded, with the navigation and the signed-in user', async () => {
    await open();

    expect(nav().getAttribute('aria-label')).toBe('Primary');
    expect(links()).toEqual(['/briefing', '/explore']);
    expect(text(nav())).toContain('Mark Devos');
  });

  it('collapses to icons that keep their names, and remembers it', async () => {
    await open();

    [...nav().querySelectorAll('button')].find((button) => text(button) === 'Collapse')!.click();
    await fixture.whenStable();

    expect(nav().getAttribute('aria-label')).toBe('Primary, collapsed');
    expect(links()).toEqual(['/briefing', '/explore']);
    expect([...nav().querySelectorAll('a')].map((link) => link.getAttribute('aria-label'))).toEqual(
      ['Briefing', 'Explore'],
    );
    expect(localStorage.getItem(STORAGE_KEY)).toBe('collapsed');
  });

  it('opens collapsed when it was left that way, and expands again', async () => {
    localStorage.setItem(STORAGE_KEY, 'collapsed');
    await open();
    expect(nav().getAttribute('aria-label')).toBe('Primary, collapsed');

    nav().querySelector<HTMLButtonElement>('button[aria-label="Expand sidebar"]')!.click();
    await fixture.whenStable();

    expect(nav().getAttribute('aria-label')).toBe('Primary');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('expanded');
  });
});

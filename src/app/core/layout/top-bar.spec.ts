import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { directory } from '../../testing/fixtures';
import { text } from '../../testing/helpers';
import { HotelContextService } from '../context/hotel-context.service';
import { TopBar } from './top-bar';

describe('TopBar', () => {
  let fixture: ComponentFixture<TopBar>;
  let context: HotelContextService;

  const bar = (): HTMLElement => fixture.nativeElement;
  const button = (label: string): HTMLButtonElement =>
    [...bar().querySelectorAll('button')].find((candidate) => text(candidate) === label)!;
  /** The items of the menu that is open; menus render outside the bar. */
  const menuItems = (): HTMLElement[] => [
    ...document.querySelectorAll<HTMLElement>('[role=menuitemradio]'),
  ];

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    context = TestBed.inject(HotelContextService);
    fixture = TestBed.createComponent(TopBar);
    fixture.detectChanges();
    TestBed.inject(HttpTestingController).expectOne('/api/hotels').flush(directory);
    await fixture.whenStable();
  });

  it('shows the hotel, the period and how fresh the figures are', () => {
    expect(button('Hotel Central Brussels')).toBeTruthy();
    expect(button('1–17 Nov 2026')).toBeTruthy();
    expect(text(bar())).toContain('As of Tue 17 Nov');
  });

  it('holds the freshness stamp back while a page is loading its figures', async () => {
    context.figuresLoading.set(true);
    await fixture.whenStable();

    expect(text(bar())).toContain('Loading today’s figures');
    expect(text(bar())).not.toContain('As of');
  });

  it('switches hotel from its menu', async () => {
    button('Hotel Central Brussels').click();
    await fixture.whenStable();
    expect(menuItems().map((item) => [text(item), item.getAttribute('aria-checked')])).toEqual([
      ['Hotel Central Brussels', 'true'],
      ['Marina Resort Algarve', 'false'],
    ]);

    menuItems()[1].click();
    await fixture.whenStable();
    expect(context.hotelId()).toBe('marina-resort');
    expect(button('Marina Resort Algarve')).toBeTruthy();
  });

  it('picks a period from the date range menu', async () => {
    button('1–17 Nov 2026').click();
    await fixture.whenStable();
    expect(menuItems().map((item) => text(item.querySelector('span')))).toEqual([
      'Month to date',
      'Last month',
      'Last 30 days',
      'Last 90 days',
    ]);
    expect(text(menuItems()[1])).toContain('1–31 Oct');

    menuItems()[1].click();
    await fixture.whenStable();
    expect(context.period()).toEqual({ from: '2026-10-01', to: '2026-10-31' });
    expect(button('1–31 Oct 2026')).toBeTruthy();
  });

  it('turns the comparison with last year off and on', async () => {
    const toggle = bar().querySelector<HTMLButtonElement>('[role=switch]')!;
    expect(toggle.getAttribute('aria-checked')).toBe('true');

    toggle.click();
    await fixture.whenStable();
    expect(context.compareToLastYear()).toBe(false);
    expect(toggle.getAttribute('aria-checked')).toBe('false');
  });
});

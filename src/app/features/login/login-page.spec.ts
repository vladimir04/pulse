import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, type MockInstance, vi } from 'vitest';
import { AuthService } from '../../core/auth/auth.service';
import { mark } from '../../testing/fixtures';
import { text } from '../../testing/helpers';
import { LoginPage } from './login-page';

/** How long "Signing in" stays on screen at the least. */
const MINIMUM_LOADING_MS = 600;

describe('LoginPage', () => {
  let fixture: ComponentFixture<LoginPage>;
  let navigate: MockInstance<Router['navigateByUrl']>;
  const login = vi.fn<AuthService['login']>();

  const page = (): HTMLElement => fixture.nativeElement;
  const field = (name: 'email' | 'password'): HTMLInputElement =>
    page().querySelector(`input[name=${name}]`)!;
  const error = (name: 'email' | 'password'): string =>
    text(page().querySelector(`#${name}-error`));

  function type(name: 'email' | 'password', value: string): void {
    field(name).value = value;
    field(name).dispatchEvent(new Event('input'));
  }

  /** Submits the form and waits until the answer is on screen. */
  async function signIn(): Promise<void> {
    page().querySelector('form')!.dispatchEvent(new Event('submit'));
    await vi.advanceTimersByTimeAsync(MINIMUM_LOADING_MS);
    fixture.detectChanges();
  }

  /** Opens the page, as reached from `returnUrl` when the guard sent the visitor here. */
  function open(returnUrl?: string): void {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { login } },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { queryParamMap: convertToParamMap(returnUrl ? { returnUrl } : {}) },
          },
        },
      ],
    });
    navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    fixture = TestBed.createComponent(LoginPage);
    fixture.detectChanges();
  }

  beforeEach(() => {
    vi.useFakeTimers();
    login.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('fills in a demo account, so the next press of Sign in signs in', async () => {
    open();
    login.mockResolvedValue(mark);

    const chip = [...page().querySelectorAll('button')].find((button) =>
      text(button).startsWith('Mark Devos'),
    )!;
    chip.click();
    fixture.detectChanges();

    expect(field('email').value).toBe('mark@pulse.com');
    expect(field('password').value).not.toBe('');
    expect(document.activeElement).toBe(page().querySelector('button[type=submit]'));

    await signIn();
    expect(login).toHaveBeenCalledWith('mark@pulse.com', field('password').value);
    expect(navigate).toHaveBeenCalledWith('/briefing');
  });

  it('asks for a password before it tries to sign in', async () => {
    open();
    type('email', 'mark@pulse.com');

    await signIn();

    expect(error('password')).toBe('Enter a password.');
    expect(field('password').getAttribute('aria-invalid')).toBe('true');
    expect(document.activeElement).toBe(field('password'));
    expect(login).not.toHaveBeenCalled();
  });

  it('shows that it is signing in', async () => {
    open();
    login.mockResolvedValue(mark);
    type('email', 'mark@pulse.com');
    type('password', 'anything');

    page().querySelector('form')!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    const submit = page().querySelector<HTMLButtonElement>('button[type=submit]')!;
    expect(submit.disabled).toBe(true);
    expect(submit.getAttribute('aria-busy')).toBe('true');
    expect(text(submit)).toContain('Signing in');
    expect(field('email').readOnly).toBe(true);
  });

  it('goes to the briefing once signed in', async () => {
    open();
    login.mockResolvedValue(mark);
    type('email', 'mark@pulse.com');
    type('password', 'anything');

    await signIn();

    expect(login).toHaveBeenCalledWith('mark@pulse.com', 'anything');
    expect(navigate).toHaveBeenCalledWith('/briefing');
  });

  it('goes back to the page the visitor was sent here from', async () => {
    open('/explore');
    login.mockResolvedValue(mark);
    type('password', 'anything');

    await signIn();

    expect(navigate).toHaveBeenCalledWith('/explore');
  });

  it('does not follow a return address outside the app', async () => {
    open('https://example.com');
    login.mockResolvedValue(mark);
    type('password', 'anything');

    await signIn();

    expect(navigate).toHaveBeenCalledWith('/briefing');
  });

  it('says so under the field when the email is not known', async () => {
    open();
    login.mockResolvedValue(undefined);
    type('email', 'nobody@pulse.com');
    type('password', 'anything');

    await signIn();

    expect(error('email')).toBe('We don’t recognise that email.');
    expect(field('email').getAttribute('aria-invalid')).toBe('true');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('says so when Pulse cannot be reached, without blaming the email', async () => {
    open();
    login.mockRejectedValue(new Error('offline'));
    type('email', 'mark@pulse.com');
    type('password', 'anything');

    await signIn();

    expect(error('email')).toBe('Pulse could not be reached. Try again.');
    expect(field('email').hasAttribute('aria-invalid')).toBe(false);
    expect(navigate).not.toHaveBeenCalled();
  });
});

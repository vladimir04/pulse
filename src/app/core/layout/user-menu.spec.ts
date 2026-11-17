import { signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import type { UserProfile } from '@shared/users';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mark } from '../../testing/fixtures';
import { text } from '../../testing/helpers';
import { AuthService } from '../auth/auth.service';
import { UserMenu } from './user-menu';

describe('UserMenu', () => {
  let fixture: ComponentFixture<UserMenu>;
  const user = signal<UserProfile | null>(mark);
  const logout = vi.fn();

  const trigger = (): HTMLButtonElement | null => fixture.nativeElement.querySelector('button');

  beforeEach(async () => {
    user.set(mark);
    logout.mockReset();
    TestBed.configureTestingModule({
      providers: [{ provide: AuthService, useValue: { user, logout } }],
    });
    fixture = TestBed.createComponent(UserMenu);
    await fixture.whenStable();
  });

  it('shows who is signed in', () => {
    expect(text(trigger())).toContain('Mark Devos');
    expect(text(trigger())).toContain('General Manager');
  });

  it('keeps the name in the label when only the avatar fits', async () => {
    fixture.componentRef.setInput('collapsed', true);
    await fixture.whenStable();

    expect(text(trigger())).toBe('MD');
    expect(trigger()!.getAttribute('aria-label')).toBe('Mark Devos, General Manager. Account menu');
  });

  it('signs out from the account menu', async () => {
    trigger()!.click();
    await fixture.whenStable();
    expect(trigger()!.getAttribute('aria-expanded')).toBe('true');

    const signOut = document.querySelector<HTMLElement>('[role=menuitem]')!;
    expect(text(signOut)).toBe('Sign out');
    signOut.click();

    expect(logout).toHaveBeenCalledOnce();
  });

  it('shows nothing when nobody is signed in', async () => {
    user.set(null);
    await fixture.whenStable();

    expect(trigger()).toBeNull();
  });
});

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  type ActivatedRouteSnapshot,
  provideRouter,
  Router,
  type RouterStateSnapshot,
  type UrlTree,
} from '@angular/router';
import type { UserProfile } from '@shared/users';
import { beforeEach, describe, expect, it } from 'vitest';
import { mark } from '../../testing/fixtures';
import { authGuard } from './auth.guard';
import { AuthService } from './auth.service';

describe('authGuard', () => {
  const user = signal<UserProfile | null>(null);
  const visit = (url: string) =>
    TestBed.runInInjectionContext(() =>
      authGuard({} as ActivatedRouteSnapshot, { url } as RouterStateSnapshot),
    );

  beforeEach(() => {
    user.set(null);
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthService, useValue: { user } }],
    });
  });

  it('lets a signed-in user through', () => {
    user.set(mark);

    expect(visit('/explore')).toBe(true);
  });

  it('sends a signed-out visitor to sign in, remembering where they were going', () => {
    const redirect = visit('/explore') as UrlTree;

    expect(TestBed.inject(Router).serializeUrl(redirect)).toBe('/login?returnUrl=%2Fexplore');
  });
});

import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import type { UserProfile } from '@shared/users';
import { firstValueFrom } from 'rxjs';
import { HotelSelection } from './hotel-selection';

const STORAGE_KEY = 'pulse.user';

/** The profile kept from the last sign-in, if the browser still has a usable one. */
function restore(): UserProfile | null {
  try {
    const stored: Partial<UserProfile> | null = JSON.parse(
      localStorage.getItem(STORAGE_KEY) ?? 'null',
    );
    return stored?.id && stored.role && stored.defaultHotelId ? (stored as UserProfile) : null;
  } catch {
    return null; // storage blocked, or not JSON
  }
}

/** Mock sign-in: it personalises the app and protects nothing. */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly hotels = inject(HotelSelection);
  private readonly current = signal<UserProfile | null>(restore());

  /** The signed-in user, or null. */
  readonly user = this.current.asReadonly();

  constructor() {
    const user = this.current();
    if (user) this.hotels.selectedId.set(user.defaultHotelId);
  }

  /** Signs in and selects the user's default hotel. Rejects with the HTTP error on failure. */
  async login(email: string, password: string): Promise<UserProfile> {
    const { user } = await firstValueFrom(
      this.http.post<{ user: UserProfile }>('/api/login', { email, password }),
    );
    this.current.set(user);
    this.hotels.selectedId.set(user.defaultHotelId);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } catch {
      // Storage blocked: the session lasts until the page reloads.
    }
    return user;
  }

  logout(): void {
    this.current.set(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Nothing was stored.
    }
    void this.router.navigateByUrl('/login');
  }
}

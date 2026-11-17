import { inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import type { UserProfile } from '@shared/users';
import { ApiService } from '../api/api.service';
import { HotelContextService } from '../context/hotel-context.service';

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
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly context = inject(HotelContextService);
  private readonly current = signal<UserProfile | null>(restore());

  /** The signed-in user, or null. */
  readonly user = this.current.asReadonly();

  constructor() {
    const user = this.current();
    if (user) this.context.hotelId.set(user.defaultHotelId);
  }

  /**
   * Signs in and selects the user's default hotel. Resolves to undefined when the credentials
   * are refused, and rejects when the API cannot be reached.
   */
  async login(email: string, password: string): Promise<UserProfile | undefined> {
    const user = await this.api.login(email, password);
    if (!user) return undefined;
    this.current.set(user);
    this.context.hotelId.set(user.defaultHotelId);
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

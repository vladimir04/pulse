import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mark, sofia } from '../../testing/fixtures';
import { HotelContextService } from '../context/hotel-context.service';
import { AuthService } from './auth.service';

const STORAGE_KEY = 'pulse.user';

describe('AuthService', () => {
  const stored = (): unknown => JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
  const selectedHotel = () => TestBed.inject(HotelContextService).hotelId();

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
  });

  it('starts signed out', () => {
    expect(TestBed.inject(AuthService).user()).toBeNull();
  });

  it('restores the last sign-in and that user’s hotel', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sofia));

    expect(TestBed.inject(AuthService).user()).toEqual(sofia);
    expect(selectedHotel()).toBe('marina-resort');
  });

  it.each(['{not json', JSON.stringify({ id: 'mark' })])(
    'ignores a stored profile it cannot use: %s',
    (value) => {
      localStorage.setItem(STORAGE_KEY, value);

      expect(TestBed.inject(AuthService).user()).toBeNull();
    },
  );

  it('signs in: keeps the user, selects their hotel and remembers them', async () => {
    const auth = TestBed.inject(AuthService);

    const attempt = auth.login('sofia@pulse.com', 'anything');
    TestBed.inject(HttpTestingController).expectOne('/api/login').flush({ user: sofia });

    await expect(attempt).resolves.toEqual(sofia);
    expect(auth.user()).toEqual(sofia);
    expect(selectedHotel()).toBe('marina-resort');
    expect(stored()).toEqual(sofia);
  });

  it('stays signed out when the credentials are refused', async () => {
    const auth = TestBed.inject(AuthService);

    const attempt = auth.login('nobody@pulse.com', 'anything');
    TestBed.inject(HttpTestingController)
      .expectOne('/api/login')
      .flush({ error: 'unknown_email' }, { status: 401, statusText: 'Unauthorized' });

    await expect(attempt).resolves.toBeUndefined();
    expect(auth.user()).toBeNull();
    expect(stored()).toBeNull();
  });

  it('signs out: forgets the user and goes to the sign-in page', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mark));
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    const auth = TestBed.inject(AuthService);

    auth.logout();

    expect(auth.user()).toBeNull();
    expect(stored()).toBeNull();
    expect(navigate).toHaveBeenCalledWith('/login');
  });
});

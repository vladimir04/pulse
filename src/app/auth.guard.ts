import { inject } from '@angular/core';
import { type CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/** Sends signed-out visitors to the sign-in page, remembering where they were going. */
export const authGuard: CanActivateFn = (_route, state) =>
  inject(AuthService).user()
    ? true
    : inject(Router).createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });

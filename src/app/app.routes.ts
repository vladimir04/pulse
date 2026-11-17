import type { Routes } from '@angular/router';
import { authGuard } from './auth.guard';
import { Briefing } from './briefing';
import { Explore } from './explore';
import { Login } from './login';

export const routes: Routes = [
  { path: 'login', component: Login },
  { path: 'briefing', component: Briefing, canActivate: [authGuard] },
  { path: 'explore', component: Explore, canActivate: [authGuard] },
  { path: '**', redirectTo: 'briefing' },
];

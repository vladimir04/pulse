import type { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { Shell } from './core/layout/shell';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/login/login-page').then((page) => page.LoginPage),
  },
  { path: '', pathMatch: 'full', redirectTo: 'briefing' },
  {
    // Signed-in pages share the shell; the guard on it covers them all.
    path: '',
    component: Shell,
    canActivate: [authGuard],
    children: [
      {
        path: 'briefing',
        loadComponent: () =>
          import('./features/briefing/briefing-page').then((page) => page.BriefingPage),
      },
      {
        path: 'explore',
        loadComponent: () =>
          import('./features/explore/explore-page').then((page) => page.ExplorePage),
      },
    ],
  },
  { path: '**', redirectTo: 'briefing' },
];

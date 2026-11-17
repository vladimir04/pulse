import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from './auth.service';

/** Placeholder sign-in form; the designed page replaces it. */
@Component({
  selector: 'app-login',
  template: `
    <main class="mx-auto max-w-sm p-6">
      <h1 class="text-2xl font-semibold">Sign in</h1>
      <form class="mt-6 flex flex-col gap-3" (submit)="signIn($event, email.value, password.value)">
        <label class="flex flex-col gap-1 text-sm">
          Email
          <input
            #email
            class="rounded border border-gray-300 px-2 py-1"
            type="email"
            name="email"
            autocomplete="username"
            required
          />
        </label>
        <label class="flex flex-col gap-1 text-sm">
          Password
          <input
            #password
            class="rounded border border-gray-300 px-2 py-1"
            type="password"
            name="password"
            autocomplete="current-password"
            required
          />
        </label>
        <button
          class="rounded border border-gray-300 px-2 py-1"
          type="submit"
          [disabled]="pending()"
        >
          {{ pending() ? 'Signing in…' : 'Sign in' }}
        </button>
        @if (error(); as message) {
          <p class="text-sm text-red-700" role="alert">{{ message }}</p>
        }
      </form>
    </main>
  `,
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly pending = signal(false);
  protected readonly error = signal<string | undefined>(undefined);

  protected async signIn(event: Event, email: string, password: string): Promise<void> {
    event.preventDefault();
    this.pending.set(true);
    this.error.set(undefined);
    try {
      await this.auth.login(email, password);
      const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
      await this.router.navigateByUrl(returnUrl?.startsWith('/') ? returnUrl : '/briefing');
    } catch (failure) {
      this.error.set(
        failure instanceof HttpErrorResponse && failure.status === 401
          ? 'No account for that email.'
          : 'Could not sign in. Is the Worker running?',
      );
    } finally {
      this.pending.set(false);
    }
  }
}

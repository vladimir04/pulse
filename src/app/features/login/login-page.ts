import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { users } from '@shared/users';
import { AuthService } from '../../core/auth/auth.service';
import { PulseDot } from '../../ui/pulse-dot';

/** How long "signing in" shows at the least, so the state never flashes by. */
const MINIMUM_LOADING_MS = 600;

const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/** Sign-in: idle, signing in, then either an error under the field or on to the app. */
@Component({
  selector: 'app-login-page',
  imports: [PulseDot],
  host: { class: 'contents' },
  templateUrl: './login-page.html',
})
export class LoginPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  /** The demo accounts offered under the form. */
  protected readonly accounts = users;
  protected readonly email = signal('');
  protected readonly password = signal('');
  protected readonly loading = signal(false);
  /** Under the email field. `unknown` also marks the field itself as invalid. */
  protected readonly emailError = signal<{ text: string; unknown: boolean } | undefined>(undefined);
  protected readonly passwordError = signal<string | undefined>(undefined);

  /** A demo chip fills the email; any password will do, so the cursor goes there. */
  protected useAccount(email: string, password: HTMLInputElement): void {
    this.email.set(email);
    this.emailError.set(undefined);
    password.focus();
  }

  protected async signIn(event: Event, password: HTMLInputElement): Promise<void> {
    event.preventDefault();
    if (this.loading()) return;
    this.emailError.set(undefined);
    this.passwordError.set(undefined);
    if (this.password() === '') {
      this.passwordError.set('Enter a password.');
      password.focus();
      return;
    }

    this.loading.set(true);
    const [attempt] = await Promise.allSettled([
      this.auth.login(this.email(), this.password()),
      wait(MINIMUM_LOADING_MS),
    ]);
    this.loading.set(false);

    if (attempt.status === 'rejected') {
      this.emailError.set({ text: 'Pulse could not be reached. Try again.', unknown: false });
    } else if (!attempt.value) {
      this.emailError.set({ text: 'We don’t recognise that email.', unknown: true });
    } else {
      const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
      await this.router.navigateByUrl(returnUrl?.startsWith('/') ? returnUrl : '/briefing');
    }
  }
}

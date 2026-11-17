import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

/** Placeholder sign-in form; the designed page replaces it. */
@Component({
  selector: 'app-login-page',
  templateUrl: './login-page.html',
})
export class LoginPage {
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
      if (await this.auth.login(email, password)) {
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        await this.router.navigateByUrl(returnUrl?.startsWith('/') ? returnUrl : '/briefing');
      } else {
        this.error.set('No account for that email.');
      }
    } catch {
      this.error.set('Could not sign in. Is the Worker running?');
    } finally {
      this.pending.set(false);
    }
  }
}

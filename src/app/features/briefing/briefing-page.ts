import { Component, inject } from '@angular/core';
import { greeting } from '@shared/users';
import { ApiService } from '../../core/api/api.service';
import { AuthService } from '../../core/auth/auth.service';
import { HotelContextService } from '../../core/context/hotel-context.service';

/** Placeholder briefing: the selected hotel's insights, ranked for the signed-in user's role. */
@Component({
  selector: 'app-briefing-page',
  templateUrl: './briefing-page.html',
})
export class BriefingPage {
  protected readonly auth = inject(AuthService);
  private readonly context = inject(HotelContextService);

  protected readonly greeting = greeting(new Date());
  protected readonly insights = inject(ApiService).insights(() => {
    const user = this.auth.user();
    return user ? { hotelId: this.context.hotelId(), role: user.role } : undefined;
  });
}

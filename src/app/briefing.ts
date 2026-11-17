import { httpResource } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import type { Insight } from '@shared/types';
import { greeting } from '@shared/users';
import { AuthService } from './auth.service';
import { HotelSelection } from './hotel-selection';

/** Placeholder briefing: the selected hotel's insights, ranked for the signed-in user's role. */
@Component({
  selector: 'app-briefing',
  template: `
    <main class="mx-auto max-w-3xl p-6">
      @if (auth.user(); as user) {
        <h1 class="text-2xl font-semibold">{{ greeting }}, {{ user.firstName }}</h1>
        <p class="text-sm text-gray-500">Ranked for a {{ user.roleLabel }}</p>
      }

      @if (insights.hasValue()) {
        <ol class="mt-6 flex flex-col gap-3">
          @for (insight of insights.value(); track insight.id) {
            <li class="rounded border border-gray-200 p-4">
              <p class="text-sm text-gray-500">{{ insight.severity }} · {{ insight.category }}</p>
              <p>{{ insight.headline }}</p>
            </li>
          }
        </ol>
      } @else if (insights.error()) {
        <p class="mt-6 text-red-700">Could not load insights. Is the Worker running?</p>
      } @else {
        <p class="mt-6 text-gray-500">Loading insights…</p>
      }
    </main>
  `,
})
export class Briefing {
  protected readonly auth = inject(AuthService);
  private readonly hotels = inject(HotelSelection);

  protected readonly greeting = greeting(new Date());
  protected readonly insights = httpResource<Insight[]>(() => {
    const user = this.auth.user();
    return user
      ? { url: '/api/insights', params: { hotelId: this.hotels.selectedId(), role: user.role } }
      : undefined;
  });
}

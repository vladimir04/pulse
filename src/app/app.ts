import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from './auth.service';
import { HotelSelection } from './hotel-selection';

/** Placeholder shell: navigation, hotel switcher and user block around the routed page. */
@Component({
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  selector: 'app-root',
  templateUrl: './app.html',
})
export class App {
  protected readonly auth = inject(AuthService);
  protected readonly hotels = inject(HotelSelection);

  protected selectHotel(event: Event): void {
    const id = (event.target as HTMLSelectElement).value;
    const hotel = this.hotels.hotels().find((candidate) => candidate.id === id);
    if (hotel) this.hotels.selectedId.set(hotel.id);
  }
}

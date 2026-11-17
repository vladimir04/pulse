import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { HotelContextService } from '../context/hotel-context.service';

/** Placeholder frame for signed-in pages: navigation, hotel switcher and user block. */
@Component({
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  selector: 'app-shell',
  templateUrl: './shell.html',
})
export class Shell {
  protected readonly auth = inject(AuthService);
  protected readonly context = inject(HotelContextService);

  protected selectHotel(event: Event): void {
    const id = (event.target as HTMLSelectElement).value;
    const hotel = this.context.hotels().find((candidate) => candidate.id === id);
    if (hotel) this.context.hotelId.set(hotel.id);
  }
}

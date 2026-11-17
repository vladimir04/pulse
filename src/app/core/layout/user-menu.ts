import { CdkMenu, CdkMenuItem, CdkMenuTrigger } from '@angular/cdk/menu';
import type { ConnectedPosition } from '@angular/cdk/overlay';
import { booleanAttribute, Component, inject, input } from '@angular/core';
import { LucideLogOut } from '@lucide/angular';
import { Avatar } from '../../ui/avatar';
import { AuthService } from '../auth/auth.service';

/**
 * The signed-in user at the foot of the sidebar. A click, Enter or Space opens the account
 * menu above it; arrow keys move within the menu and Escape closes it.
 */
@Component({
  selector: 'app-user-menu',
  imports: [Avatar, CdkMenu, CdkMenuItem, CdkMenuTrigger, LucideLogOut],
  templateUrl: './user-menu.html',
})
export class UserMenu {
  /** Avatar only, for the 56px sidebar; name and role move to the accessible label. */
  readonly collapsed = input(false, { transform: booleanAttribute });

  protected readonly auth = inject(AuthService);
  /** 8px above the block, left edges aligned. */
  protected readonly above: ConnectedPosition[] = [
    { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', offsetY: -8 },
  ];
}

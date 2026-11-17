import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AskService } from '../ask/ask.service';
import { AskDrawer } from './ask-drawer/ask-drawer';
import { Sidebar } from './sidebar';
import { TopBar } from './top-bar';

/**
 * The frame around every signed-in page: sidebar, top context bar, then the page. The Ask
 * drawer sits over all of it.
 */
@Component({
  selector: 'app-shell',
  imports: [AskDrawer, RouterOutlet, Sidebar, TopBar],
  templateUrl: './shell.html',
})
export class Shell {
  protected readonly ask = inject(AskService);
}

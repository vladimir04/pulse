import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AskService } from '../ask/ask.service';
import { AskDrawer } from './ask-drawer/ask-drawer';
import { Sidebar } from './sidebar';
import { TopBar } from './top-bar';

/**
 * The frame around every signed-in page: sidebar, top context bar, then the page. The Ask
 * drawer sits over all of it, and ⌘K or Ctrl+K opens it from anywhere.
 */
@Component({
  selector: 'app-shell',
  imports: [AskDrawer, RouterOutlet, Sidebar, TopBar],
  host: { '(document:keydown)': 'onKeydown($event)' },
  templateUrl: './shell.html',
})
export class Shell {
  protected readonly ask = inject(AskService);

  protected onKeydown(event: KeyboardEvent): void {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      if (this.ask.isOpen()) this.ask.close();
      else this.ask.open();
    }
  }
}

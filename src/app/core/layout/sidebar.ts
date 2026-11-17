import { Component, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import {
  LucideCompass,
  LucideNewspaper,
  LucidePanelLeftClose,
  LucidePanelLeftOpen,
} from '@lucide/angular';
import { PulseDot } from '../../ui/pulse-dot';
import { UserMenu } from './user-menu';

const STORAGE_KEY = 'pulse.sidebar';

function restore(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'collapsed';
  } catch {
    return false; // storage blocked
  }
}

/** The charcoal sidebar: wordmark, navigation, the collapse control and the user block. */
@Component({
  selector: 'app-sidebar',
  imports: [
    LucideCompass,
    LucideNewspaper,
    LucidePanelLeftClose,
    LucidePanelLeftOpen,
    PulseDot,
    RouterLink,
    RouterLinkActive,
    UserMenu,
  ],
  host: { class: 'contents' },
  templateUrl: './sidebar.html',
})
export class Sidebar {
  /** 56px instead of 220px. Kept between visits. */
  protected readonly collapsed = signal(restore());

  protected toggle(): void {
    this.collapsed.update((collapsed) => !collapsed);
    try {
      localStorage.setItem(STORAGE_KEY, this.collapsed() ? 'collapsed' : 'expanded');
    } catch {
      // Storage blocked: the choice lasts until the page reloads.
    }
  }
}

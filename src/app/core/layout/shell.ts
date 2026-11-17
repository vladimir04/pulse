import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Sidebar } from './sidebar';
import { TopBar } from './top-bar';

/** The frame around every signed-in page: sidebar, top context bar, then the page. */
@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, Sidebar, TopBar],
  templateUrl: './shell.html',
})
export class Shell {}

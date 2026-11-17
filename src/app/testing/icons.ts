/*
 * Stand-ins for the Lucide icons, used by the specs only: tsconfig.spec.json maps
 * '@lucide/angular' to this file. The real package is a single file holding every icon, and
 * the test runner loads all of it (about 30 seconds) for specs that never look at an icon.
 * An icon the app starts using needs a line here.
 */
import { Component, type EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';

@Component({ selector: 'svg[lucideArrowDown]', template: '' })
export class LucideArrowDown {}

@Component({ selector: 'svg[lucideArrowRight]', template: '' })
export class LucideArrowRight {}

@Component({ selector: 'svg[lucideArrowUp]', template: '' })
export class LucideArrowUp {}

@Component({ selector: 'svg[lucideCalendar]', template: '' })
export class LucideCalendar {}

@Component({ selector: 'svg[lucideCheck]', template: '' })
export class LucideCheck {}

@Component({ selector: 'svg[lucideChevronDown]', template: '' })
export class LucideChevronDown {}

@Component({ selector: 'svg[lucideChevronRight]', template: '' })
export class LucideChevronRight {}

@Component({ selector: 'svg[lucideChevronsUpDown]', template: '' })
export class LucideChevronsUpDown {}

@Component({ selector: 'svg[lucideCompass]', template: '' })
export class LucideCompass {}

@Component({ selector: 'svg[lucideLogOut]', template: '' })
export class LucideLogOut {}

@Component({ selector: 'svg[lucideNewspaper]', template: '' })
export class LucideNewspaper {}

@Component({ selector: 'svg[lucidePanelLeftClose]', template: '' })
export class LucidePanelLeftClose {}

@Component({ selector: 'svg[lucidePanelLeftOpen]', template: '' })
export class LucidePanelLeftOpen {}

@Component({ selector: 'svg[lucideRotateCw]', template: '' })
export class LucideRotateCw {}

@Component({ selector: 'svg[lucideX]', template: '' })
export class LucideX {}

export const provideLucideConfig = (_config: object): EnvironmentProviders =>
  makeEnvironmentProviders([]);

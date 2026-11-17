/*
 * Small helpers shared by the specs.
 */
import { booleanAttribute, Component, input, type Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { ChartSpec } from '@shared/types';
import { BarChart } from '../ui/charts/bar-chart';
import { LineChart } from '../ui/charts/line-chart';

/** An element's text as a reader sees it: trimmed, with runs of whitespace as one space. */
export const text = (element: Element | null | undefined): string =>
  (element?.textContent ?? '').replace(/\s+/g, ' ').trim();

/**
 * Lets a response that was just flushed reach its resource. Use `fixture.whenStable()` when
 * every request has been answered; it would wait for one the spec is still holding.
 */
export const landed = (): Promise<void> => new Promise((resolve) => setTimeout(resolve));

/** Somewhere for the router to go when a spec follows a link. */
@Component({ template: '' })
export class BlankPage {}

@Component({
  selector: 'app-bar-chart',
  host: { role: 'img', '[attr.aria-label]': 'ariaLabel()' },
  template: '',
})
class BarChartStub {
  readonly spec = input.required<ChartSpec>();
  readonly ariaLabel = input.required<string>();
  readonly compact = input(false, { transform: booleanAttribute });
}

@Component({
  selector: 'app-line-chart',
  host: { role: 'img', '[attr.aria-label]': 'ariaLabel()' },
  template: '',
})
class LineChartStub {
  readonly spec = input.required<ChartSpec>();
  readonly ariaLabel = input.required<string>();
  readonly compact = input(false, { transform: booleanAttribute });
}

/** Charts draw on a canvas, which jsdom does not have: `host` gets empty stand-ins instead. */
export function stubCharts(host: Type<unknown>): void {
  TestBed.overrideComponent(host, {
    remove: { imports: [BarChart, LineChart] },
    add: { imports: [BarChartStub, LineChartStub] },
  });
}

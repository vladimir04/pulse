import { Component, computed, input } from '@angular/core';
import type { Event, Period } from '@shared/types';
import { formatDayMonth, formatRange } from '../../util/format';

const DAY_MS = 86_400_000;
/** The plot width the labels are fitted to; the row itself stretches with the chart. */
const TRACK_PX = 640;
/** Roughly what a character of the 12px label takes. */
const CHARACTER_PX = 6.4;

interface PlacedEvent {
  label: string;
  /** When it happened: 28 Sep, or 6–24 Oct for one that ran for a while. */
  dates: string;
  /** Where its visible part starts and, for one that ran for a while, ends: 0–100 along the period. */
  start: number;
  end: number | undefined;
  /** Whether its first and last day fall inside the period, and so get a diamond. */
  startShown: boolean;
  endShown: boolean;
  /** The label grows away from the nearest other event: to the right, or back to the left. */
  growsLeft: boolean;
  /** Labels that would run into each other go on a second line. */
  line: 0 | 1;
}

/** Places each event on the period's axis and keeps the labels off each other. */
function place(events: Pick<Event, 'label' | 'date' | 'endDate'>[], period: Period): PlacedEvent[] {
  const [first, last] = [Date.parse(period.from), Date.parse(period.to)];
  const along = (date: string): number =>
    Math.min(100, Math.max(0, ((Date.parse(date) - first) / Math.max(last - first, DAY_MS)) * 100));

  const placed = events
    .map((event) => ({
      label: event.label,
      dates: event.endDate
        ? formatRange({ from: event.date, to: event.endDate }, { year: false })
        : formatDayMonth(event.date),
      start: along(event.date),
      end: event.endDate ? along(event.endDate) : undefined,
      startShown: event.date >= period.from,
      endShown: event.endDate !== undefined && event.endDate <= period.to,
    }))
    .sort((a, b) => a.start - b.start);

  const taken: [number, number][][] = [[], []];
  return placed.map((event, i) => {
    const width = (event.label.length + event.dates.length + 2) * CHARACTER_PX;
    const at = (event.start / 100) * TRACK_PX;
    const [before, after] = [placed[i - 1], placed[i + 1]];
    const nearestIsAfter =
      after !== undefined &&
      (before === undefined || after.start - event.start < event.start - before.start);
    const growsLeft = (nearestIsAfter || at + width > TRACK_PX) && at - width >= 0;
    const span: [number, number] = growsLeft ? [at - width, at] : [at, at + width];
    const line = taken[0].some(([from, to]) => span[0] < to && from < span[1]) ? 1 : 0;
    taken[line].push(span);
    return { ...event, growsLeft, line };
  });
}

/**
 * The events of a period, in a row under a chart's date axis: a diamond on the day, a line for
 * one that ran for a while, and its name and date underneath. Put it directly below a full-size
 * line chart; it is inset to match the chart's plot.
 */
@Component({
  selector: 'app-events-row',
  host: { class: 'block' },
  template: `
    <div
      class="relative ml-12 mr-2 text-table"
      role="list"
      aria-label="Events"
      [class]="lines() > 1 ? 'h-14' : 'h-10'"
    >
      <span class="absolute -left-12 top-0 text-secondary" aria-hidden="true">Events</span>
      @for (event of placed(); track event.label + event.dates) {
        <div role="listitem">
          @if (event.end !== undefined) {
            <span
              class="absolute top-[7px] border-t-[1.5px] border-ink"
              aria-hidden="true"
              [style.left.%]="event.start"
              [style.width.%]="event.end - event.start"
            ></span>
          }
          @if (event.startShown) {
            <span
              class="absolute top-[5px] size-[6px] -translate-x-1/2 rotate-45 bg-ink"
              aria-hidden="true"
              [style.left.%]="event.start"
            ></span>
          }
          @if (event.endShown) {
            <span
              class="absolute top-[5px] size-[6px] -translate-x-1/2 rotate-45 bg-ink"
              aria-hidden="true"
              [style.left.%]="event.end"
            ></span>
          }
          <span
            class="absolute whitespace-nowrap"
            [class]="[event.growsLeft ? '-translate-x-full' : '', event.line ? 'top-9' : 'top-5']"
            [style.left.%]="event.start"
          >
            <span>{{ event.label }}</span>
            <span class="ml-1.5 text-secondary tabular">{{ event.dates }}</span>
          </span>
        </div>
      }
    </div>
  `,
})
export class EventsRow {
  readonly events = input.required<Pick<Event, 'label' | 'date' | 'endDate'>[]>();
  /** The period the chart above covers. */
  readonly period = input.required<Period>();

  protected readonly placed = computed(() => place(this.events(), this.period()));
  protected readonly lines = computed(() => (this.placed().some((event) => event.line) ? 2 : 1));
}

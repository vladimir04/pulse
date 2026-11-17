import { Component, computed, input } from '@angular/core';
import type { Event, Period } from '@shared/types';
import { formatDayMonth, formatRange } from '../../util/format';

const DAY_MS = 86_400_000;
/** A label goes beside its marker when at least this share of the row is free on that side. */
const ROOM_FOR_LABEL = 45;
/** The gap between a marker and the label beside it. */
const GAP = '10px';

interface PlacedEvent {
  label: string;
  /** When it happened: 28 Sep, or 6–24 Oct for one that ran for a while. */
  dates: string;
  /** Where its visible part starts and ends, 0–100 along the period; the same for a single day. */
  start: number;
  end: number;
  /** Whether its first and last day fall inside the period, and so get a diamond. */
  startShown: boolean;
  endShown: boolean;
  /** Where the label has room: after the marker, before it, or on a line of its own under it. */
  side: 'after' | 'before' | 'under';
}

/** Places each event along the period, oldest first, and finds a side for its label. */
function place(events: Pick<Event, 'label' | 'date' | 'endDate'>[], period: Period): PlacedEvent[] {
  const [first, last] = [Date.parse(period.from), Date.parse(period.to)];
  const along = (date: string): number =>
    Math.min(100, Math.max(0, ((Date.parse(date) - first) / Math.max(last - first, DAY_MS)) * 100));

  return [...events]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((event) => {
      const start = along(event.date);
      const end = event.endDate ? along(event.endDate) : start;
      const side: PlacedEvent['side'] =
        100 - end >= ROOM_FOR_LABEL ? 'after' : start >= ROOM_FOR_LABEL ? 'before' : 'under';
      return {
        label: event.label,
        dates: event.endDate
          ? formatRange({ from: event.date, to: event.endDate }, { year: false })
          : formatDayMonth(event.date),
        start,
        end,
        startShown: event.date >= period.from,
        endShown: event.endDate !== undefined && event.endDate <= period.to,
        side,
      };
    });
}

/**
 * The events of a period under a chart's date axis, one line each so that events which overlap
 * in time stay apart: a diamond on the day, a line for one that ran for a while, and its name
 * and dates beside it. An event that began before the period runs in from the left edge. Put
 * the row directly below a full-size line chart; it is inset to match the chart's plot.
 */
@Component({
  selector: 'app-events-row',
  host: { class: 'block' },
  template: `
    <div class="relative flex flex-col ml-12 mr-2 text-table" role="list" aria-label="Events">
      <span class="absolute -left-12 top-0.5 text-secondary" aria-hidden="true">Events</span>
      @for (event of placed(); track event.label + event.dates) {
        <div class="relative" role="listitem" [class]="event.side === 'under' ? 'h-9' : 'h-5'">
          @if (event.end > event.start) {
            <span
              class="absolute top-[9px] border-t-[1.5px] border-ink"
              aria-hidden="true"
              [style.left.%]="event.start"
              [style.width.%]="event.end - event.start"
            ></span>
          }
          @if (event.startShown) {
            <span
              class="absolute top-[7px] size-[6px] -translate-x-1/2 rotate-45 bg-ink"
              aria-hidden="true"
              [style.left.%]="event.start"
            ></span>
          }
          @if (event.endShown) {
            <span
              class="absolute top-[7px] size-[6px] -translate-x-1/2 rotate-45 bg-ink"
              aria-hidden="true"
              [style.left.%]="event.end"
            ></span>
          }
          <span
            class="absolute whitespace-nowrap"
            [class]="event.side === 'under' ? 'top-5' : 'top-0.5'"
            [style.left]="labelLeft(event)"
            [style.right]="labelRight(event)"
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

  /** After the marker, or under a wide span from where it starts. */
  protected labelLeft(event: PlacedEvent): string | null {
    if (event.side === 'after') return `calc(${event.end}% + ${GAP})`;
    return event.side === 'under' ? `${event.start}%` : null;
  }

  /** Before the marker: the label ends where the marker starts. */
  protected labelRight(event: PlacedEvent): string | null {
    return event.side === 'before' ? `calc(${100 - event.start}% + ${GAP})` : null;
  }
}

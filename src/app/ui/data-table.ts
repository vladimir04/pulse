import { Component, computed, input, linkedSignal } from '@angular/core';
import { LucideArrowDown, LucideArrowUp, LucideChevronsUpDown } from '@lucide/angular';
import { entityDotClass } from './charts/chart-theme';

export interface DataTableColumn<Row> {
  /** The property of a row this column shows. */
  key: keyof Row & string;
  label: string;
  /** Right-aligned, and sorted as a number. */
  numeric?: boolean;
  /** Width class of the column, for example w-[152px]. */
  width?: string;
  /** How a value reads; as it is by default. */
  format?: (value: Row[keyof Row & string]) => string;
}

export interface DataTableSort<Row> {
  key: keyof Row & string;
  direction: 'ascending' | 'descending';
}

/**
 * A table with 32px rows, numbers right-aligned, and one sorted column at a time. The first
 * column names the row. A header sorts high to low on the first click and flips on the next.
 */
@Component({
  selector: 'app-data-table',
  imports: [LucideArrowDown, LucideArrowUp, LucideChevronsUpDown],
  host: { class: 'block' },
  template: `
    <table class="w-full text-table">
      <thead>
        <tr class="h-8 border-t border-line bg-page text-secondary">
          @for (column of columns(); track column.key) {
            @let sorted = sort()?.key === column.key ? sort()?.direction : undefined;
            <th
              scope="col"
              class="px-4 font-medium"
              [class]="[column.width ?? '', column.numeric ? '' : 'text-left']"
              [attr.aria-sort]="sorted"
            >
              <button
                type="button"
                class="flex items-center gap-1 rounded-[2px] font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-ink"
                [class]="[
                  column.numeric ? 'ml-auto' : '',
                  sorted
                    ? 'text-ink'
                    : 'group transition-colors duration-150 ease-out hover:text-ink',
                ]"
                (click)="sortBy(column)"
              >
                @if (!column.numeric) {
                  <span>{{ column.label }}</span>
                }
                @if (sorted === 'descending') {
                  <svg lucideArrowDown class="size-4 shrink-0"></svg>
                } @else if (sorted === 'ascending') {
                  <svg lucideArrowUp class="size-4 shrink-0"></svg>
                } @else {
                  <svg
                    lucideChevronsUpDown
                    class="size-4 shrink-0 opacity-0 transition-opacity duration-150 ease-out group-hover:opacity-100"
                  ></svg>
                }
                @if (column.numeric) {
                  <span>{{ column.label }}</span>
                }
              </button>
            </th>
          }
        </tr>
      </thead>
      <tbody>
        @for (row of sortedRows(); track row) {
          <tr
            class="h-8 border-t border-line transition-colors duration-150 ease-out hover:bg-page"
          >
            @for (column of columns(); track column.key; let first = $first) {
              @if (first) {
                <th scope="row" class="px-4 text-left font-normal">
                  @if (entityId()?.(row); as entity) {
                    <span class="flex items-center gap-2">
                      <span
                        class="size-2 shrink-0 rounded-full"
                        aria-hidden="true"
                        [class]="dotClass(entity)"
                      ></span>
                      <span>{{ cell(row, column) }}</span>
                    </span>
                  } @else {
                    {{ cell(row, column) }}
                  }
                </th>
              } @else {
                <td class="px-4" [class]="column.numeric ? 'text-right tabular' : ''">
                  {{ cell(row, column) }}
                </td>
              }
            }
          </tr>
        }
        @if (total(); as total) {
          <tr class="h-8 border-t border-line font-medium">
            @for (column of columns(); track column.key; let first = $first) {
              @if (first) {
                <th scope="row" class="px-4 text-left font-medium">{{ cell(total, column) }}</th>
              } @else {
                <td class="px-4" [class]="column.numeric ? 'text-right tabular' : ''">
                  {{ cell(total, column) }}
                </td>
              }
            }
          </tr>
        }
      </tbody>
    </table>
  `,
})
export class DataTable<Row extends object> {
  readonly columns = input.required<DataTableColumn<Row>[]>();
  readonly rows = input.required<Row[]>();
  /** A summary row under the others; it does not sort. */
  readonly total = input<Row>();
  /** The entity a row stands for, to show its colour dot in the first column. */
  readonly entityId = input<(row: Row) => string | undefined>();
  /** The column the table is sorted by when it first shows. */
  readonly initialSort = input<DataTableSort<Row>>();

  protected readonly sort = linkedSignal(() => this.initialSort());
  protected readonly dotClass = entityDotClass;

  protected readonly sortedRows = computed(() => {
    const sort = this.sort();
    if (!sort) return this.rows();
    const flip = sort.direction === 'ascending' ? 1 : -1;
    return [...this.rows()].sort((a, b) => {
      const [x, y] = [a[sort.key], b[sort.key]];
      const order =
        typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y));
      return order * flip;
    });
  });

  protected sortBy(column: DataTableColumn<Row>): void {
    const current = this.sort();
    const flipped = current?.key === column.key && current.direction === 'descending';
    this.sort.set({ key: column.key, direction: flipped ? 'ascending' : 'descending' });
  }

  protected cell(row: Row, column: DataTableColumn<Row>): string {
    const value = row[column.key];
    return column.format ? column.format(value) : String(value);
  }
}

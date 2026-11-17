import { Component, computed, input } from '@angular/core';
import { explore } from '@shared/narratives';
import type { ChannelPerformance } from '@shared/types';
import { DataTable, type DataTableColumn, type DataTableSort } from '../../ui/data-table';
import { Skeleton } from '../../ui/skeleton';
import { formatCount, formatCurrency } from '../../util/format';

/** What the table shows of a channel; the total row has the same shape. */
type ChannelRow = Pick<
  ChannelPerformance,
  | 'channelId'
  | 'name'
  | 'roomsSold'
  | 'grossRevenue'
  | 'distributionCost'
  | 'netRevenue'
  | 'netRate'
  | 'grossRevenueRank'
>;

const count = (value: ChannelRow[keyof ChannelRow]): string => formatCount(Number(value));
/** Thousands keep their decimal so the column lines up: €503.4k, €222.0k. */
const money = (value: ChannelRow[keyof ChannelRow]): string =>
  formatCurrency(Number(value), { fixed: true });
const earnsMost = (row: ChannelRow): boolean => row.grossRevenueRank === 1;

const COLUMNS: DataTableColumn<ChannelRow>[] = [
  { key: 'name', label: 'Channel' },
  { key: 'roomsSold', label: 'Rooms', numeric: true, width: 'w-[120px]', format: count },
  {
    key: 'grossRevenue',
    label: 'Gross revenue',
    numeric: true,
    width: 'w-[136px]',
    format: money,
    strong: earnsMost,
  },
  {
    key: 'distributionCost',
    label: 'Commission',
    numeric: true,
    width: 'w-[128px]',
    format: money,
  },
  { key: 'netRevenue', label: 'Net revenue', numeric: true, width: 'w-[128px]', format: money },
  {
    key: 'netRate',
    label: 'Net rate',
    numeric: true,
    width: 'w-[120px]',
    format: money,
    strong: earnsMost,
  },
];
const BY_NET_RATE: DataTableSort<ChannelRow> = { key: 'netRate', direction: 'descending' };

/**
 * The booking channels over the period: rooms, revenue before and after each channel's cost,
 * and what the hotel keeps per room night, which the table is sorted by. The channel that
 * earns most before costs stands out, so its place by net rate is easy to see.
 */
@Component({
  selector: 'app-channels-panel',
  imports: [DataTable, Skeleton],
  host: { class: 'contents' },
  template: `
    <section
      class="flex flex-col col-span-2 rounded-md border border-line bg-card overflow-hidden"
      aria-labelledby="channels-title"
    >
      <div class="flex flex-col gap-2 p-4">
        <div class="flex items-baseline gap-2">
          <h2 id="channels-title" class="text-title font-medium">Channels</h2>
          <span class="text-table text-secondary">sorted by net rate</span>
        </div>
        @if (summary(); as summary) {
          <p class="text-pretty">{{ summary }}</p>
        }
      </div>
      @if (channels(); as channels) {
        <app-data-table
          [columns]="columns"
          [rows]="channels"
          [total]="total()"
          [entityId]="channelId"
          [initialSort]="byNetRate"
        />
      } @else {
        <div class="px-4 pb-4"><app-skeleton class="h-[224px]" /></div>
      }
    </section>
  `,
})
export class ChannelsPanel {
  /** Undefined while loading. */
  readonly channels = input<ChannelPerformance[]>();

  protected readonly columns = COLUMNS;
  protected readonly byNetRate = BY_NET_RATE;
  protected readonly channelId = (row: ChannelRow): string | undefined =>
    row.channelId || undefined;

  protected readonly summary = computed(() => {
    const channels = this.channels();
    return channels && explore.channels(channels);
  });

  /** All channels together; the net rate is what the hotel kept for every room night sold. */
  protected readonly total = computed<ChannelRow | undefined>(() => {
    const channels = this.channels();
    if (!channels?.length) return undefined;
    const sum = (pick: (row: ChannelPerformance) => number): number =>
      channels.reduce((total, row) => total + pick(row), 0);
    const [roomsSold, netRevenue] = [sum((row) => row.roomsSold), sum((row) => row.netRevenue)];
    return {
      channelId: '',
      name: 'Total',
      roomsSold,
      grossRevenue: sum((row) => row.grossRevenue),
      distributionCost: sum((row) => row.distributionCost),
      netRevenue,
      netRate: roomsSold ? netRevenue / roomsSold : 0,
      grossRevenueRank: 0,
    };
  });
}

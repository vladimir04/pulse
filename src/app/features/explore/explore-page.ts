import { DecimalPipe } from '@angular/common';
import { Component, computed, inject, resource } from '@angular/core';
import type { EChartsCoreOption } from 'echarts/core';
import { NgxEchartsDirective } from 'ngx-echarts';
import { ApiService } from '../../core/api/api.service';
import { HotelContextService } from '../../core/context/hotel-context.service';
import { chartColors } from '../../ui/charts/chart-theme';

/** Placeholder explore page: the selected hotel over the selected period. */
@Component({
  imports: [DecimalPipe, NgxEchartsDirective],
  selector: 'app-explore-page',
  templateUrl: './explore-page.html',
})
export class ExplorePage {
  private readonly context = inject(HotelContextService);
  // The query module carries the whole dataset, so it loads as its own chunk after first paint.
  private readonly queries = resource({ loader: () => import('@shared/queries') });

  protected readonly view = computed(() => {
    const queries = this.queries.value();
    const hotelId = this.context.hotelId();
    const period = this.context.period();
    const hotel = queries?.getHotels().find((candidate) => candidate.id === hotelId);
    if (!queries || !hotel || !period) return undefined;
    const { from, to } = period;
    const occupancy = queries.getTimeseries({
      hotelId,
      metric: 'occupancy',
      from,
      to,
      grain: 'day',
    });
    return { hotel, from, to, occupancy };
  });

  protected readonly kpis = inject(ApiService).kpis(() => {
    const view = this.view();
    return view && { hotelId: view.hotel.id, from: view.from, to: view.to };
  });

  protected readonly chartOptions = computed<EChartsCoreOption>(() => {
    const occupancy = this.view()?.occupancy;
    const colors = chartColors();
    return {
      grid: { left: 40, right: 16, top: 16, bottom: 28 },
      tooltip: { trigger: 'axis' },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: occupancy?.x.map((date) => date.slice(5)) ?? [],
        axisTick: { show: false },
        axisLine: { lineStyle: { color: colors.axisLine } },
        axisLabel: { color: colors.axisLabel },
      },
      yAxis: {
        type: 'value',
        max: 100,
        splitLine: { lineStyle: { color: colors.gridLine } },
        axisLabel: { color: colors.axisLabel, formatter: '{value}%' },
      },
      series: [
        {
          name: 'Occupancy',
          type: 'line',
          data: occupancy?.current ?? [],
          symbolSize: 8,
          lineStyle: { width: 2, color: colors.current },
          itemStyle: { color: colors.current },
        },
      ],
    };
  });
}

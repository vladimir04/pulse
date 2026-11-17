import { DecimalPipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { Component, computed, resource } from '@angular/core';
import { addDays } from '@shared/metrics';
import type { Kpis } from '@shared/types';
import type { EChartsCoreOption } from 'echarts/core';
import { NgxEchartsDirective } from 'ngx-echarts';

const SERIES_COLOR = '#2a78d6';
const AXIS_LABEL_COLOR = '#898781';
const DAYS_SHOWN = 14;

@Component({
  imports: [DecimalPipe, NgxEchartsDirective],
  selector: 'app-root',
  templateUrl: './app.html',
})
export class App {
  // The query module carries the whole dataset, so it loads as its own chunk after first paint.
  private readonly queries = resource({ loader: () => import('@shared/queries') });

  /** The first hotel's most recent days, once the dataset has loaded. */
  protected readonly view = computed(() => {
    const queries = this.queries.value();
    if (!queries) return undefined;
    const hotel = queries.getHotels()[0];
    const to = queries.getAsOf();
    const from = addDays(to, 1 - DAYS_SHOWN);
    const occupancy = queries.getTimeseries({
      hotelId: hotel.id,
      metric: 'occupancy',
      from,
      to,
      grain: 'day',
    });
    return { hotel, from, to, occupancy };
  });

  protected readonly kpis = httpResource<Kpis>(() => {
    const view = this.view();
    return (
      view && {
        url: '/api/kpis',
        params: { hotelId: view.hotel.id, from: view.from, to: view.to },
      }
    );
  });

  protected readonly chartOptions = computed<EChartsCoreOption>(() => {
    const occupancy = this.view()?.occupancy;
    return {
      grid: { left: 40, right: 16, top: 16, bottom: 28 },
      tooltip: { trigger: 'axis' },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: occupancy?.x.map((date) => date.slice(5)) ?? [],
        axisTick: { show: false },
        axisLine: { lineStyle: { color: '#c3c2b7' } },
        axisLabel: { color: AXIS_LABEL_COLOR },
      },
      yAxis: {
        type: 'value',
        max: 100,
        splitLine: { lineStyle: { color: '#e1e0d9' } },
        axisLabel: { color: AXIS_LABEL_COLOR, formatter: '{value}%' },
      },
      series: [
        {
          name: 'Occupancy',
          type: 'line',
          data: occupancy?.current ?? [],
          symbolSize: 8,
          lineStyle: { width: 2, color: SERIES_COLOR },
          itemStyle: { color: SERIES_COLOR },
        },
      ],
    };
  });
}

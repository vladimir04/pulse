import { DecimalPipe, PercentPipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { Component, computed, resource } from '@angular/core';
import type { Kpis } from '@shared/types';
import type { EChartsCoreOption } from 'echarts/core';
import { NgxEchartsDirective } from 'ngx-echarts';

const SERIES_COLOR = '#2a78d6';
const AXIS_LABEL_COLOR = '#898781';
const DAYS_SHOWN = 14;

@Component({
  imports: [DecimalPipe, PercentPipe, NgxEchartsDirective],
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
    const days = queries.getRoomsDays({ hotelId: hotel.id }).slice(-DAYS_SHOWN);
    return { hotel, days, from: days[0].date, to: days[days.length - 1].date };
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
    const days = this.view()?.days ?? [];
    return {
      grid: { left: 40, right: 16, top: 16, bottom: 28 },
      tooltip: { trigger: 'axis' },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: days.map((day) => day.date.slice(5)),
        axisTick: { show: false },
        axisLine: { lineStyle: { color: '#c3c2b7' } },
        axisLabel: { color: AXIS_LABEL_COLOR },
      },
      yAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: '#e1e0d9' } },
        axisLabel: { color: AXIS_LABEL_COLOR },
      },
      series: [
        {
          name: 'Rooms sold',
          type: 'line',
          data: days.map((day) => day.roomsSold),
          symbolSize: 8,
          lineStyle: { width: 2, color: SERIES_COLOR },
          itemStyle: { color: SERIES_COLOR },
        },
      ],
    };
  });
}

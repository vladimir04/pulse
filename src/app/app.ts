import { DecimalPipe, PercentPipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { Component } from '@angular/core';
import { getDays, getHotel } from '@shared/queries';
import type { Kpis } from '@shared/types';
import type { EChartsCoreOption } from 'echarts/core';
import { NgxEchartsDirective } from 'ngx-echarts';

const SERIES_COLOR = '#2a78d6';
const AXIS_LABEL_COLOR = '#898781';

@Component({
  imports: [DecimalPipe, PercentPipe, NgxEchartsDirective],
  selector: 'app-root',
  templateUrl: './app.html',
})
export class App {
  private readonly days = getDays();

  protected readonly hotel = getHotel();
  protected readonly from = this.days[0].date;
  protected readonly to = this.days[this.days.length - 1].date;

  protected readonly kpis = httpResource<Kpis>(() => ({
    url: '/api/kpis',
    params: { from: this.from, to: this.to },
  }));

  protected readonly chartOptions: EChartsCoreOption = {
    grid: { left: 40, right: 16, top: 16, bottom: 28 },
    tooltip: { trigger: 'axis' },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: this.days.map((day) => day.date.slice(5)),
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
        data: this.days.map((day) => day.roomsSold),
        symbolSize: 8,
        lineStyle: { width: 2, color: SERIES_COLOR },
        itemStyle: { color: SERIES_COLOR },
      },
    ],
  };
}

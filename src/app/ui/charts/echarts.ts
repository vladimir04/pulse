/*
 * The parts of ECharts the charts use. Loaded on demand (see app.config.ts), so the library is
 * only downloaded by a page that draws a chart.
 */
import { BarChart, LineChart } from 'echarts/charts';
import { GridComponent, MarkLineComponent, TooltipComponent } from 'echarts/components';
import * as echarts from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([
  BarChart,
  LineChart,
  GridComponent,
  MarkLineComponent,
  TooltipComponent,
  CanvasRenderer,
]);

export { echarts };

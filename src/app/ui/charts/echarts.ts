/*
 * The parts of ECharts the charts use. Loaded on demand (see app.config.ts), so the library is
 * only downloaded by a page that draws a chart.
 */
import { BarChart, LineChart } from 'echarts/charts';
import { GridComponent, MarkLineComponent, TooltipComponent } from 'echarts/components';
import * as echarts from 'echarts/core';
import { LabelLayout } from 'echarts/features';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([
  BarChart,
  LineChart,
  GridComponent,
  MarkLineComponent,
  TooltipComponent,
  // Keeps the labels at the ends of two lines apart when the lines end close together.
  LabelLayout,
  CanvasRenderer,
]);

// A chart's canvas inherits the page's tabular figures, but ECharts measures text on a canvas
// of its own, outside the page, where figures are proportional. Measure on a canvas in the
// page instead, so labels are placed by the widths they are drawn at.
const ruler = document.createElement('canvas');
ruler.hidden = true;
document.body.append(ruler);
const rulerContext = ruler.getContext('2d');
if (rulerContext) {
  echarts.setPlatformAPI({
    measureText: (text, font) => {
      rulerContext.font = font ?? '12px sans-serif';
      return rulerContext.measureText(text);
    },
  });
}

export { echarts };

import type { ChartSpec } from '@shared/types';
import type { EChartsCoreOption } from 'echarts/core';
import { formatAxisDate, formatAxisValue, formatDate, formatValue } from '../../util/format';
import { chartColors, entityColor, token } from './chart-theme';

type Series = ChartSpec['series'][number];

/**
 * ECharts options for a ChartSpec, in the design's chart style: hairline grid, 12px axis text,
 * last year dashed grey, entities in their own colours, no area fill, square bar ends, a
 * card-style tooltip, and one 400ms draw-in. `compact` is the small chart of an insight card:
 * no value axis, and only the first and last date.
 */
export function chartOptions(spec: ChartSpec, compact: boolean): EChartsCoreOption {
  const color = chartColors();
  const bars = spec.type === 'bar';
  const text = {
    color: color.axisLabel,
    fontFamily: token('--font-sans'),
    fontSize: parseFloat(token('--text-table')),
  };
  const colorOf = (series: Series): string => {
    if (series.role === 'lastYear') return color.lastYear;
    return series.role === 'entity' ? entityColor(series.entityId ?? '') : color.current;
  };
  const lastIndex = spec.x.length - 1;

  // A full-size chart over days names a few of them: the first, each first of a month and the
  // last, with their weekday ("Thu 1 Oct"). A period inside one month also names its middle.
  const daily = !compact && !bars && spec.x.every((label) => /^d{4}-d{2}-d{2}$/.test(label));
  const named = new Set([0, lastIndex]);
  spec.x.forEach((label, index) => {
    if (label.endsWith('-01')) named.add(index);
  });
  if (named.size < 3) named.add(Math.round(lastIndex / 2));

  // The compact line chart names each line at its end, as "€214k 2026": the last value, then
  // the year when the axis is dated, else the series name. The current line also ends in a dot.
  const endsLabelled = compact && !bars;
  const lastYearOfAxis = /^\d{4}-/.test(spec.x[lastIndex] ?? '')
    ? Number(spec.x[lastIndex].slice(0, 4))
    : undefined;
  const endName = (series: Series): string => {
    if (lastYearOfAxis === undefined || series.role === 'entity') return series.name;
    return `${series.role === 'lastYear' ? lastYearOfAxis - 1 : lastYearOfAxis}`;
  };
  const lastPoint = (series: Series): number =>
    series.data.reduce<number>((last, value, i) => (value === null ? last : i), -1);
  const endLabel = (series: Series) => {
    const value = series.data[lastPoint(series)] ?? null;
    return {
      show: value !== null,
      distance: 7,
      formatter: `{value|${value === null ? '' : formatValue(value, spec.unit)}}{name|${endName(series)}}`,
      rich: {
        value:
          series.role === 'current' ? { ...text, color: color.ink, fontWeight: 500 } : { ...text },
        name: { ...text, padding: [0, 0, 0, 4] },
      },
    };
  };
  const withEndDot = (series: Series): unknown[] => {
    const last = lastPoint(series);
    return series.data.map((value, i) =>
      i === last && series.role === 'current'
        ? { value, symbol: 'circle', symbolSize: 6 }
        : { value, symbol: 'none' },
    );
  };

  return {
    // The current period draws in once; later updates and reduced motion do not animate.
    animation: !matchMedia('(prefers-reduced-motion: reduce)').matches,
    animationDuration: 400,
    animationEasing: 'cubicOut',
    animationDurationUpdate: 0,
    grid: compact
      ? { left: 2, right: endsLabelled ? 84 : 2, top: 8, bottom: 20 }
      : { left: 48, right: 8, top: 8, bottom: 24 },
    tooltip: {
      trigger: 'axis',
      backgroundColor: color.card,
      borderColor: color.gridLine,
      borderWidth: 1,
      padding: 8,
      textStyle: { ...text, color: color.ink },
      extraCssText: `border-radius: ${token('--radius-md')}; box-shadow: ${token('--shadow-overlay')};`,
      axisPointer: {
        type: bars ? 'none' : 'line',
        lineStyle: { color: color.gridLine, type: 'solid' },
      },
      valueFormatter: (value: unknown) =>
        typeof value === 'number' ? formatValue(value, spec.unit) : '—',
    },
    xAxis: {
      type: 'category',
      data: spec.x,
      boundaryGap: bars,
      axisTick: { show: false },
      axisLine: { lineStyle: { color: color.axisLine } },
      axisLabel: {
        ...text,
        formatter: daily ? formatDate : formatAxisDate,
        hideOverlap: true,
        // Dates run edge to edge; a bar's label stays under its bar.
        ...(bars ? {} : { alignMinLabel: 'left', alignMaxLabel: 'right' }),
        ...(compact && !bars
          ? { interval: (index: number) => index === 0 || index === lastIndex }
          : {}),
        ...(daily ? { interval: (index: number) => named.has(index) } : {}),
      },
    },
    yAxis: {
      type: 'value',
      scale: !bars,
      splitNumber: 4,
      splitLine: { show: !compact, lineStyle: { color: color.gridLine, width: 1 } },
      axisLabel: {
        ...text,
        show: !compact,
        formatter: (value: number) => formatAxisValue(value, spec.unit),
      },
    },
    series: spec.series.map((series, index) => ({
      name: series.name,
      data: endsLabelled ? withEndDot(series) : series.data,
      ...(endsLabelled
        ? { endLabel: endLabel(series), labelLayout: { moveOverlap: 'shiftY' } }
        : {}),
      ...(bars
        ? {
            type: 'bar',
            barMaxWidth: 24,
            barGap: '25%',
            itemStyle: { color: colorOf(series), borderRadius: 0 },
          }
        : {
            type: 'line',
            showSymbol: endsLabelled,
            symbolSize: 6,
            itemStyle: { color: colorOf(series) },
            lineStyle: {
              color: colorOf(series),
              width: series.role === 'current' ? 2 : 1.5,
              type: series.role === 'lastYear' ? [4, 3] : 'solid',
            },
          }),
      // Events sit on the date axis as the diamond used in event chips.
      ...(index === 0 && spec.markers?.length
        ? {
            markLine: {
              silent: true,
              symbol: ['diamond', 'none'],
              symbolSize: 8,
              // Only the diamond shows; the event is named by the chip beside the chart.
              lineStyle: { color: color.ink, width: 0 },
              label: { show: false },
              data: spec.markers.map((marker) => ({ name: marker.label, xAxis: marker.x })),
            },
          }
        : {}),
    })),
  };
}

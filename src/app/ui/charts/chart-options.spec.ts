import type { ChartSpec } from '@shared/types';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { chartOptions } from './chart-options';

/** The parts of the ECharts options these specs look at. */
interface Drawn {
  animation: boolean;
  grid: { right: number };
  xAxis: { data: string[]; boundaryGap: boolean };
  yAxis: { axisLabel: { show: boolean } };
  series: {
    name: string;
    type: 'line' | 'bar';
    data: unknown[];
    lineStyle?: { type: unknown };
    endLabel?: { formatter: string };
    markLine?: { data: { name: string; xAxis: string }[] };
  }[];
}

const pace: ChartSpec = {
  type: 'line',
  title: 'December rooms on the books',
  unit: 'count',
  x: ['2026-11-03', '2026-11-10', '2026-11-17'],
  series: [
    { name: 'Last year', role: 'lastYear', data: [1626, 1820, 2009] },
    { name: 'This year', role: 'current', data: [1536, 1650, 1766] },
  ],
  markers: [{ x: '2026-11-03', label: 'Two corporate accounts cut Q4 travel budgets' }],
};

describe('chartOptions', () => {
  let reducedMotion = false;
  const draw = (spec: ChartSpec, compact = false) =>
    chartOptions(spec, compact) as unknown as Drawn;

  beforeEach(() => {
    reducedMotion = false;
    // jsdom has no matchMedia; the chart only asks it about reduced motion.
    vi.stubGlobal('matchMedia', () => ({ matches: reducedMotion }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('draws each series over the dates, last year dashed', () => {
    const { xAxis, series } = draw(pace);

    expect(xAxis.data).toEqual(pace.x);
    expect(series.map(({ name, type, data }) => ({ name, type, data }))).toEqual([
      { name: 'Last year', type: 'line', data: [1626, 1820, 2009] },
      { name: 'This year', type: 'line', data: [1536, 1650, 1766] },
    ]);
    expect(series.map(({ lineStyle }) => lineStyle?.type)).toEqual([[4, 3], 'solid']);
  });

  it('marks events on the date axis', () => {
    expect(draw(pace).series[0].markLine?.data).toEqual([
      { name: 'Two corporate accounts cut Q4 travel budgets', xAxis: '2026-11-03' },
    ]);
  });

  it('names each line of a compact chart at its end, with its last value and year', () => {
    const { grid, yAxis, series } = draw(pace, true);

    expect(yAxis.axisLabel.show).toBe(false);
    expect(grid.right).toBeGreaterThan(2);
    expect(series.map(({ endLabel }) => endLabel?.formatter)).toEqual([
      '{value|2,009}{name|2025}',
      '{value|1,766}{name|2026}',
    ]);
    // The current line ends in a dot; last year's does not.
    expect(series[1].data.at(-1)).toMatchObject({ value: 1766, symbol: 'circle' });
    expect(series[0].data.at(-1)).toMatchObject({ value: 2009, symbol: 'none' });
  });

  it('draws bars side by side for categories', () => {
    const { xAxis, series } = draw({
      type: 'bar',
      title: 'Revenue and profit',
      unit: 'currency',
      x: ['Revenue', 'Profit'],
      series: [
        { name: 'Last year', role: 'lastYear', data: [1_100_000, 344_173] },
        { name: 'This year', role: 'current', data: [1_105_000, 296_853] },
      ],
    });

    expect(xAxis.boundaryGap).toBe(true);
    expect(series.map(({ type }) => type)).toEqual(['bar', 'bar']);
    expect(series.every(({ endLabel }) => endLabel === undefined)).toBe(true);
  });

  it('does not animate for a viewer who asked for reduced motion', () => {
    expect(draw(pace).animation).toBe(true);

    reducedMotion = true;
    expect(draw(pace).animation).toBe(false);
  });
});

/*
 * Colours for charts, read from the design tokens in src/styles/tokens.css. Charts draw on a
 * canvas, which cannot resolve var(--…) itself, so the values are looked up here; that keeps
 * the tokens the single place a colour is defined.
 */

const token = (name: string): string =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim();

/** Colours by the role a series plays, and for the axes and grid. Call when building a chart. */
export const chartColors = () => ({
  current: token('--chart-current'),
  lastYear: token('--chart-last-year'),
  axisLabel: token('--chart-axis-label'),
  axisLine: token('--chart-axis-line'),
  gridLine: token('--chart-grid-line'),
});

/** The token of each entity that has a colour of its own, so it looks the same in every chart. */
const ENTITY_TOKENS: Record<string, string> = {
  direct: '--chart-entity-direct',
  'booking-com': '--chart-entity-booking-com',
  expedia: '--chart-entity-expedia',
  corporate: '--chart-entity-corporate',
  'travel-agents': '--chart-entity-travel-agents',
};

/** The colour of an entity series, by its id (a booking channel). */
export const entityColor = (entityId: string): string =>
  token(ENTITY_TOKENS[entityId] ?? '--chart-entity-other');

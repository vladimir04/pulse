/*
 * Colours and type for charts, read from the design tokens in src/styles/tokens.css. Charts
 * draw on a canvas, which cannot resolve var(--…) itself, so the values are looked up here;
 * the tokens stay the single place a colour is defined.
 */

export const token = (name: string): string =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim();

/** Colours by the role a series plays, and for the axes, grid and tooltip. */
export const chartColors = () => ({
  current: token('--color-ink'),
  lastYear: token('--color-last-year'),
  axisLabel: token('--color-secondary'),
  axisLine: token('--color-line'),
  gridLine: token('--color-line'),
  card: token('--color-card'),
  ink: token('--color-ink'),
});

/** Each entity keeps one colour in every chart and table. Keyed by booking channel id. */
const ENTITIES: Record<string, { token: string; dot: string }> = {
  direct: { token: '--color-direct', dot: 'bg-direct' },
  'booking-com': { token: '--color-booking', dot: 'bg-booking' },
  expedia: { token: '--color-expedia', dot: 'bg-expedia' },
  corporate: { token: '--color-corporate', dot: 'bg-corporate' },
  'travel-agents': { token: '--color-agents', dot: 'bg-agents' },
};

/** The colour of an entity's series in a chart. */
export const entityColor = (entityId: string): string =>
  token(ENTITIES[entityId]?.token ?? '--color-muted');

/** The background class of an entity's dot in a table or legend. */
export const entityDotClass = (entityId: string): string => ENTITIES[entityId]?.dot ?? 'bg-muted';

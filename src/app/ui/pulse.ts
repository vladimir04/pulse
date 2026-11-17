/** Length of the `pulse` keyframes in tokens.css. */
const PULSE_MS = 1600;

/**
 * A negative animation delay that puts an element on one app-wide beat, so everything that
 * pulses (wordmark dot, skeletons) does so in phase, whenever it appeared.
 */
export const pulsePhase = (): string => `-${Math.round(performance.now() % PULSE_MS)}ms`;

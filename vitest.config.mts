import { defineConfig } from 'vitest/config';

// The semantic layer is plain TypeScript and runs on Node. The app's specs (src/**/*.spec.ts)
// need the Angular compiler and a DOM, so `ng test` runs those instead.
export default defineConfig({
  test: { include: ['shared/**/*.test.ts'] },
});

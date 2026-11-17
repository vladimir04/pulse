# Pulse

## App structure (`src/app`)

- **Dependency direction:** features → core, ui, util, `@shared`; core → util, `@shared`;
  ui → util, `@shared` types only. No feature imports another feature. ui has no services and
  no HTTP.
- **HTTP:** all HTTP goes through `core/api/api.service.ts`. Pages load data, ui components
  receive inputs.
- **State:** global state lives in core services as signals.
- **Routes:** a new route is a new folder under `features`, lazy-loaded.

## Design

The design export is in `design/` (start with its `README.md`). Match the mockups; do not
"improve" them.

- **Tokens:** `design/tokens.css` is ported to `src/styles/tokens.css`. Every colour, radius and
  spacing in a component comes from those variables or the Tailwind theme mapped to them. No
  ad-hoc hex values anywhere.
- **Porting:** port component by component from the exported HTML: copy the markup and Tailwind
  classes, replace static content with inputs. Keep class names and structure recognisable
  against the mockup.
- **Type:** Plus Jakarta Sans 400 and 500, loaded in `index.html`. Every number is set in
  tabular figures: the `tabular` utility goes on each element that shows a formatted number.
- **Icons:** Lucide (`@lucide/angular`), 16px, stroke 1.5, for navigation and actions only.
- **Motion:** one keyframe set in `tokens.css`. `pulse` runs 1600ms ease-in-out with opacity
  going 1 → .45 → 1; `ring` runs 2s with scale 1 → 1.8 and opacity .6 → 0. Skeletons and the
  wordmark dot share `pulse` and stay in phase (`ui/pulse.ts`). Everything is off under
  `prefers-reduced-motion: reduce`. Hover and other transitions are 150ms ease-out. Charts draw
  in once over 400ms. No other animation.
- **Accessibility baseline:** visible focus rings in accent ink; menus are real menus (button
  with `aria-expanded`, Escape closes, arrow keys move); tables use `<th scope>`; every chart
  has an `aria-label` summarising its series; colour is never the only signal (deltas carry
  their sign).
- **Components:** `ui` components are presentational (inputs and outputs only), pages load data
  through `ApiService`, state lives in core services.

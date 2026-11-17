# Pulse

Hotel analytics prototype. One Cloudflare Worker serves an Angular SPA, a JSON API and an MCP
server, all reading `data/data.json` through the semantic layer in `shared/`.

## Layout

- `src/` — Angular app (standalone components, signals, Tailwind v4, ngx-echarts). Imports the
  shared module as `@shared/*`.
- `worker/index.ts` — the Worker, bundled by Wrangler. It loops over the tool registry:
  - `GET /api/<name>` for every tool, with query parameters checked by the tool's schema
  - `/mcp` → stateless MCP server with the same tools
  - `GET /api/health` → `{ ok: true }`
  - everything else → the built SPA from `dist/pulse/browser`
- `shared/` — the semantic layer, used by both the app and the Worker:
  - `types.ts` — the dataset model and the result types
  - `metrics.ts` — the formulas, as pure functions over a period's totals
  - `glossary.ts` — label, formula, meaning, unit and good direction of every metric
  - `queries.ts` — indexed queries and their input schemas
  - `detectors.ts`, `narratives.ts` — rules that turn the data into ranked insights, and their wording
  - `tools.ts` — the tool registry
- `data/data.json` — two years of daily data for two hotels, plus booking snapshots and events.
  Written by `scripts/generate.ts`; do not edit by hand.

## Tools

Each tool is an MCP tool and a GET route. Dates are `YYYY-MM-DD`; "today" is the dataset's `asOf`.

| MCP tool                     | Route                         | Parameters                                 |
| ---------------------------- | ----------------------------- | ------------------------------------------ |
| `list_hotels`                | `/api/hotels`                 |                                            |
| `list_metrics`               | `/api/metrics`                |                                            |
| `get_kpis`                   | `/api/kpis`                   | `hotelId`, `from`, `to`                    |
| `get_timeseries`             | `/api/timeseries`             | `hotelId`, `metric`, `from`, `to`, `grain` |
| `get_channel_performance`    | `/api/channel-performance`    | `hotelId`, `from`, `to`                    |
| `get_booking_pace`           | `/api/booking-pace`           | `hotelId`, `stayFrom`, `stayTo`            |
| `get_restaurant_performance` | `/api/restaurant-performance` | `hotelId`, `from`, `to`                    |
| `get_staffing`               | `/api/staffing`               | `hotelId`, `from`, `to`                    |
| `get_events`                 | `/api/events`                 | `hotelId`, `from`, `to`                    |
| `get_insights`               | `/api/insights`               | `hotelId`                                  |

## Authentication is a mock

Sign-in exists to show how the app adapts to who is using it. It is a UI and UX mock, not
security: `POST /api/login` accepts any non-empty password for the three demo users below, the
profile is kept in the browser's `localStorage` under `pulse.user`, and every API route and MCP
tool answers without it. Do not put real data behind it.

| Email               | User           | Role             | Default hotel         |
| ------------------- | -------------- | ---------------- | --------------------- |
| `mark@example.com`  | Mark Devos     | General Manager  | Hotel Central         |
| `sofia@example.com` | Sofia Marques  | Revenue Director | Marina Resort Algarve |
| `tomas@example.com` | Tomás Ferreira | F&B Manager      | Marina Resort Algarve |

The role only changes the order of insights: `get_insights` and `/api/insights` take an optional
`role`, which moves the categories that role cares about up the ranking. The app's routes are
`/login`, `/briefing` and `/explore`; the last two send signed-out visitors to `/login`.

## Scripts

| Script               | What it does                                                          |
| -------------------- | --------------------------------------------------------------------- |
| `npm run dev:worker` | `wrangler dev` on http://localhost:8787 (needs `npm run build` once)  |
| `npm run dev`        | `ng serve` on http://localhost:4200, proxying `/api` and `/mcp` to it |
| `npm run build`      | Builds the SPA into `dist/pulse/browser`                              |
| `npm run typecheck`  | Generates Worker types, then type-checks the app and the Worker       |
| `npm test`           | Runs the vitest file for the formulas and the planted stories         |
| `npm run deploy`     | Builds the SPA and deploys the Worker with its assets                 |
| `npm run generate`   | Rewrites `data/data.json` (seeded, so the output is always the same)  |

For local development run `npm run build` once, then `npm run dev:worker` and `npm run dev` in
two terminals.

# Pulse

Hotel analytics prototype. One Cloudflare Worker serves an Angular SPA, a JSON API and an MCP
server, all reading `data/data.json` through the semantic layer in `shared/`.

## Stack

| Layer            | Technology                                                                                                            |
| ---------------- | --------------------------------------------------------------------------------------------------------------------- |
| App              | Angular 22: standalone components, signals, zoneless change detection, `httpResource` for loading, lazy-loaded routes |
| Styling          | Tailwind CSS v4 on the design tokens in `src/styles/tokens.css`                                                       |
| UI               | Angular CDK for menus and overlays; Lucide icons (`@lucide/angular`)                                                  |
| Charts           | ECharts 6 through ngx-echarts, downloaded with the first chart rather than with the app                               |
| API and hosting  | One Cloudflare Worker (Wrangler 4) serving the JSON API, the MCP server and the built SPA as static assets            |
| MCP              | `@modelcontextprotocol/server` behind the stateless handler from `agents`                                             |
| Semantic layer   | Plain TypeScript in `shared/`, shared by the app and the Worker; Zod 4 validates every query's input                  |
| Data             | A seeded generator (`scripts/generate.ts`, run with tsx) writes `data/data.json`; there is no database                |
| Language, format | TypeScript 6, Prettier                                                                                                |
| Tests            | Vitest 5; the app's specs run through Angular's `ng test` builder on jsdom                                            |

## Structure

- `src/app/` — Angular app (standalone components, signals, Tailwind v4, ngx-echarts). Imports the
  shared module as `@shared/*`. The rules for what may import what are in `CLAUDE.md`.
  - `core/` — `auth`, `api` (the only HTTP client), `context` (selected hotel and period) and
    `layout` (the frame around signed-in pages)
  - `features/` — one lazy-loaded folder per route: `login`, `briefing`, `explore`
  - `ui/` — presentational pieces; for now only the chart theme
  - `util/` — formatting and date helpers
- `src/styles/` — design tokens and the Tailwind entry point.
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

## Testing

`npm test` runs two suites, one after the other.

| Suite          | Files                                               | Runner                                             | Size                  |
| -------------- | --------------------------------------------------- | -------------------------------------------------- | --------------------- |
| Semantic layer | `shared/*.test.ts`                                  | Vitest on Node                                     | 6 tests               |
| App            | `src/app/**/*.spec.ts`, next to the file under test | `ng test`: Vitest with jsdom and Angular's TestBed | 100 tests in 19 files |

- **Stand-ins.** `src/app/testing/` holds the fixtures and helpers. Charts are swapped for empty
  components, because jsdom has no canvas. Lucide icons resolve to the stand-ins in
  `src/app/testing/icons.ts` (mapped in `tsconfig.spec.json`), because the real package loads
  every icon and made the run several times slower; an icon the app starts using needs a line
  there.

`npm run test:coverage` prints a coverage report for the app specs. They reach about 80% of the
app's statements when files without a spec are counted too.

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

| Email             | User           | Role             | Default hotel         |
| ----------------- | -------------- | ---------------- | --------------------- |
| `mark@pulse.com`  | Mark Devos     | General Manager  | Hotel Central         |
| `sofia@pulse.com` | Sofia Marques  | Revenue Director | Marina Resort Algarve |
| `tomas@pulse.com` | Tomas Ferreira | F&B Manager      | Marina Resort Algarve |

The role only changes the order of insights: `get_insights` and `/api/insights` take an optional
`role`, which moves the categories that role cares about up the ranking. The app's routes are
`/login`, `/briefing` and `/explore`; the last two send signed-out visitors to `/login`.

## Scripts

| Script                  | What it does                                                           |
| ----------------------- | ---------------------------------------------------------------------- |
| `npm run dev:worker`    | `wrangler dev` on http://localhost:8787 (needs `npm run build` once)   |
| `npm run dev`           | `ng serve` on http://localhost:4200, proxying `/api` and `/mcp` to it  |
| `npm run build`         | Builds the SPA into `dist/pulse/browser`                               |
| `npm run typecheck`     | Generates Worker types, then type-checks the app and the Worker        |
| `npm test`              | Runs the semantic-layer tests (vitest), then the app specs (`ng test`) |
| `npm run test:coverage` | Runs the app specs with a coverage report                              |
| `npm run deploy`        | Builds the SPA and deploys the Worker with its assets                  |
| `npm run generate`      | Rewrites `data/data.json` (seeded, so the output is always the same)   |

For local development run `npm run build` once, then `npm run dev:worker` and `npm run dev` in
two terminals.

## Ask setup

The Ask drawer calls `POST /api/ask`. The Worker sends the question to Anthropic's Messages API,
whose MCP connector calls the tools at `MCP_PUBLIC_URL`. Ask needs an Anthropic API key with
access to the model selected by `MODEL` in `wrangler.jsonc`.

For local development, add the following to `.dev.vars` in the project root (the file is
gitignored):

```dotenv
ANTHROPIC_API_KEY=replace-with-your-api-key
MCP_PUBLIC_URL=https://your-worker.your-subdomain.workers.dev/mcp
```

`MCP_PUBLIC_URL` must be a publicly reachable HTTPS URL ending in `/mcp`: Anthropic calls it
from its servers, so `localhost` cannot work. The default in `wrangler.jsonc` points to the
deployed demo. When using that endpoint locally, Ask reads the deployed tools and dataset;
keep them in sync with the local app. To test local tool or data changes, expose the local
Worker on port 8787 through a public HTTPS tunnel and use its `/mcp` URL instead. Restart
`npm run dev:worker` after changing `.dev.vars`.

For your own deployment, set `MCP_PUBLIC_URL` in `wrangler.jsonc` to that Worker's public
`/mcp` URL, and check that `MODEL` is available to your Anthropic account. Store the API key as
a Cloudflare Worker secret, then deploy:

```sh
npx wrangler secret put ANTHROPIC_API_KEY
npm run deploy
```

Wrangler prompts for the key; `.dev.vars` is only used locally. The key stays in the Worker.
To check the setup, sign in, open Ask and ask "Which booking channel keeps the most per room
night?" If it fails, inspect the `POST /api/ask` response in the browser's Network panel for
the error; the drawer currently shows a generic retry message.

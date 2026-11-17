# Pulse

Hotel analytics prototype. One Cloudflare Worker serves an Angular SPA, a JSON API and an MCP
server, all reading `data/data.json` through `shared/queries.ts`.

## Layout

- `src/` — Angular app (standalone components, signals, Tailwind v4, ngx-echarts). Imports the
  shared module as `@shared/*`.
- `worker/index.ts` — the Worker, bundled by Wrangler:
  - `GET /api/health` → `{ ok: true }`
  - `GET /api/hotels` → the hotels
  - `GET /api/kpis?hotelId=&from=&to=` → `{ occupancy, adr, revpar }` (dates are `YYYY-MM-DD`,
    inclusive, both optional)
  - `/mcp` → stateless MCP server with one tool, `get_kpis({ hotelId, from, to })`
  - everything else → the built SPA from `dist/pulse/browser`
- `shared/` — `types.ts`, `metrics.ts`, `queries.ts`, used by both the app and the Worker.
- `data/data.json` — two years of daily data for two hotels, plus booking snapshots and events.
  Written by `scripts/generate.ts`; do not edit by hand.

## Scripts

| Script               | What it does                                                          |
| -------------------- | --------------------------------------------------------------------- |
| `npm run dev:worker` | `wrangler dev` on http://localhost:8787 (needs `npm run build` once)  |
| `npm run dev`        | `ng serve` on http://localhost:4200, proxying `/api` and `/mcp` to it |
| `npm run build`      | Builds the SPA into `dist/pulse/browser`                              |
| `npm run typecheck`  | Generates Worker types, then type-checks the app and the Worker       |
| `npm run deploy`     | Builds the SPA and deploys the Worker with its assets                 |
| `npm run generate`   | Rewrites `data/data.json` (seeded, so the output is always the same)  |

For local development run `npm run build` once, then `npm run dev:worker` and `npm run dev` in
two terminals.

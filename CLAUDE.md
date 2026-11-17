# Pulse

## App structure (`src/app`)

- **Dependency direction:** features → core, ui, util, `@shared`; core → util, `@shared`;
  ui → util, `@shared` types only. No feature imports another feature. ui has no services and
  no HTTP.
- **HTTP:** all HTTP goes through `core/api/api.service.ts`. Pages load data, ui components
  receive inputs.
- **State:** global state lives in core services as signals.
- **Routes:** a new route is a new folder under `features`, lazy-loaded.

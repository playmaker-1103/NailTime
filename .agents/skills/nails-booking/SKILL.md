---
name: nails-booking
description: Project workflow for the Luna Nails Studio booking app. Use when working in this repository on React/Vite frontend code, Express API routes, JWT admin login, Supabase Postgres data, Vercel deployment, booking/service features, tests, or production verification.
---

# Nails Booking

## Project Shape

Use this skill for the Luna Nails Studio booking app in this repository.

- Frontend: React + Vite in `client/`
- Backend: Express in `server/`
- Serverless entry for Vercel: `api/index.js`
- Database: Supabase Postgres project `NailTime`, ref `fwyaujiafibtdpssqotr`
- Admin auth: custom JWT login handled by Express, not Supabase Auth
- Deployment: Vercel project `nails-booking-app`

Keep customer booking public. Protect admin management through Express JWT middleware.

## Core Workflows

Before changing behavior, inspect the relevant files with `rg`/`sed`. Preserve the current API response shape where practical because the frontend expects Mongo-style aliases such as `_id`, `durationMinutes`, `isActive`, and populated `booking.service`.

For backend changes:

1. Update controllers/routes in `server/`.
2. Keep Supabase table columns snake_case.
3. Map API responses through `server/utils/dbMappers.js`.
4. Run `npm test --prefix server`.

For frontend changes:

1. Update React pages/components in `client/src/`.
2. Keep `VITE_API_URL=/api` for deployed builds.
3. Keep local API requests compatible with Vite proxy or explicit env.
4. Run `npm run build --prefix client`.

For deployment changes:

1. Run root `npm test` and `npm run build`.
2. Deploy with Vercel.
3. Verify the public site, `/api/health`, `/api/services`, and admin login.

## Supabase

Use Supabase MCP for schema inspection, SQL queries, and migrations. The project is:

```text
project_ref: fwyaujiafibtdpssqotr
url: https://fwyaujiafibtdpssqotr.supabase.co
```

Main tables:

- `services`: `id`, `name`, `description`, `duration_minutes`, `price`, `is_active`, timestamps
- `bookings`: `id`, `service_id`, customer fields, `appointment_date`, `appointment_time`, `notes`, `status`, timestamps

Availability is service-duration-aware and uses the configured salon capacity:

```text
SALON_STAFF_CAPACITY=4
APPOINTMENT_SLOT_INTERVAL_MINUTES=15
```

Active bookings can overlap until that capacity is reached. Do not reintroduce a unique
`(appointment_date, appointment_time)` constraint unless the product switches back to single-chair
booking.

New customer bookings are confirmed immediately by the API when capacity is available.

Never put a Supabase PAT (`sbp_...`) in app env vars. The Express backend needs `SUPABASE_SERVICE_ROLE_KEY` or an appropriate server-side secret. If only a publishable key is available, treat it as a temporary demo setup and note the RLS risk.

## Vercel

Root deployment files matter:

- `package.json` provides Vercel build/test scripts and root dependencies.
- `vercel.json` builds `client/dist`, rewrites `/api/*` to `api/index.js`, and rewrites app routes to `index.html`.
- `api/index.js` exports the Express app.

Current public URL:

```text
https://nails-booking-app.vercel.app
```

After deploy, verify:

```bash
curl -s https://nails-booking-app.vercel.app/api/health
curl -s https://nails-booking-app.vercel.app/api/services
```

## Admin Demo

The deployed demo currently uses:

```text
admin@example.com
admin123
```

Do not expose new secrets in final answers. If a token has been pasted into chat, recommend rotation rather than repeating it.

## Verification Checklist

Run the smallest useful checks for the change:

```bash
npm test
npm run build
```

For browser verification, check these paths:

- `/` booking form loads services
- `/services` lists services
- `/admin` redirects or shows dashboard depending on login state
- `/api/health` returns `ok`

If CodeGraph is useful, the repo is indexed with `.codegraph/`; run `npx @colbymchenry/codegraph status --json` to inspect index health.

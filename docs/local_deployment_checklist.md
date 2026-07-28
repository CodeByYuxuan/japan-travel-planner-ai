# Local deployment checklist

This checklist captures the steps needed to bring the project up locally in a way that matches the current repository state.

## 1. Environment prerequisites

- Install Node.js 24 and ensure the repository uses it via `.nvmrc`.
- Enable Corepack and activate pnpm 10.14.0:

```bash
nvm install
nvm use
corepack enable
corepack prepare pnpm@10.14.0 --activate
```

- Install Docker Desktop and make sure PostgreSQL 16 is available locally. If Docker is unavailable, run PostgreSQL 16 on localhost:5432 directly.
- Keep the repository in a local directory that is not synced by iCloud. macOS file sync can interfere with pnpm, Prisma, and generated files.

## 2. Install dependencies

```bash
pnpm install --frozen-lockfile
```

## 3. Prepare environment variables

Copy the template into the API workspace:

```bash
cp .env.example apps/api/.env
```

Then edit `apps/api/.env` as needed for local development. The minimum values for a basic local run are:

- `DATABASE_URL` pointing to PostgreSQL 16
- `JWT_SECRET` set to a locally usable secret
- `WEB_ORIGIN=http://localhost:5173`
- `API_PORT=3001`

## 4. Start PostgreSQL 16

A Docker Desktop example:

```bash
docker run \
  --name japan-travel-planner-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=japan_travel_planner_ai \
  -p 5432:5432 \
  -d postgres:16-alpine
```

Verify readiness:

```bash
docker exec japan-travel-planner-postgres \
  pg_isready -U postgres -d japan_travel_planner_ai
```

If the container is already running, verify that the database is reachable before continuing.

Subsequent lifecycle commands:

```bash
docker start japan-travel-planner-postgres
docker stop japan-travel-planner-postgres
```

## 5. Run Prisma migration and seed

```bash
cp .env.example apps/api/.env
pnpm --filter @japan-travel-planner/api exec prisma migrate deploy
pnpm --filter @japan-travel-planner/api db:seed
```

These commands create the Prisma client, apply the schema to the configured PostgreSQL database, and seed the local dataset.

## 6. Start the applications

Run both app shells together:

```bash
pnpm dev
```

Or start them separately:

```bash
pnpm dev:web
pnpm dev:api
```

Expected local URLs:

- Web: http://localhost:5173
- API: http://localhost:3001

## 7. Acceptance checks

### Mock flow

- Open the web app and confirm the default mock preview path renders without a database dependency.
- Submit a trip request and verify that a mock itinerary appears in the planner board.

### Save and reopen

- Edit the generated itinerary locally.
- Save the itinerary and confirm the trip is stored through the API-backed trip flow.
- Reopen the saved trip from the trips panel and verify that the saved content is restored.

### Share and PDF

- Create a public share link for a saved itinerary.
- Confirm the read-only shared page opens correctly.
- Export the itinerary to PDF and verify that the file downloads successfully.

### Optional enrichment

- Leave external provider keys unset to confirm the app still loads in a reduced mode.
- Add OpenAI credentials to verify real itinerary generation.
- Add Google Maps, weather, or Rakuten credentials only if the corresponding enrichment panel needs to be exercised.

## 8. Quality checks

Before declaring a change ready, run:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm --filter @japan-travel-planner/api db:validate
pnpm test:e2e
git diff --check
```

Then manually confirm the runtime flow:

```bash
pnpm dev:api
curl -i http://localhost:3001/api/health
```

In a second terminal:

```bash
pnpm dev:web
```

Complete the previously validated acceptance flow: mock preview, save, refresh reopen, edit and save again, public read-only share, and private/public PDF export.

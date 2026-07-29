# Japan Travel Planner AI

Japan Travel Planner AI is a local-first travel planning application for Japan trips. It turns trip dates, cities, pace, budget, and interests into an editable day-by-day itinerary with optional enrichment from maps, weather, hotels, route hints, sharing, and PDF export.

## Current Status

The repository is no longer just an initial scaffold. It now contains a working TypeScript monorepo with:

- a React + Vite web app for trip intake, itinerary editing, mock/API mode switching, save/reopen flows, public sharing, and PDF export;
- an Express + TypeScript API with Prisma and PostgreSQL persistence;
- optional enrichment providers for OpenAI itinerary generation, Google Maps route hints, weather summaries, and Rakuten hotel suggestions that degrade gracefully when credentials are missing.

The implementation and acceptance flow are documented in [docs/development_plan.md](docs/development_plan.md), [docs/local_deployment_checklist.md](docs/local_deployment_checklist.md), and [docs/stabilization_validation_after_t33.md](docs/stabilization_validation_after_t33.md).

## Requirements

- Node.js 24 (the repository pins this in [.nvmrc](.nvmrc))
- Corepack enabled with pnpm 10.14.0
- Docker Desktop with PostgreSQL 16, or a local PostgreSQL 16 service running on localhost:5432
- A local checkout outside iCloud-synced folders, because macOS syncing can interfere with pnpm, Prisma, and generated files

## Environment Setup

```bash
nvm install
nvm use
corepack enable
corepack prepare pnpm@10.14.0 --activate
pnpm install --frozen-lockfile
cp .env.example apps/api/.env
```

The copied environment file should be edited for local use before starting the API. The repository root contains the base template and the API expects the file at [apps/api/.env](apps/api/.env).

## Database Setup

Start PostgreSQL 16 before running Prisma commands. A Docker Desktop example is:

```bash
docker run \
  --name japan-travel-planner-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=japan_travel_planner_ai \
  -p 5432:5432 \
  -d postgres:16-alpine
```

Verify the container is ready:

```bash
docker exec japan-travel-planner-postgres \
  pg_isready -U postgres -d japan_travel_planner_ai
```

Then copy the environment file and initialize the schema and seed data:

```bash
cp .env.example apps/api/.env
pnpm --filter @japan-travel-planner/api exec prisma migrate deploy
pnpm --filter @japan-travel-planner/api db:seed
```

Subsequent container lifecycle commands:

```bash
docker start japan-travel-planner-postgres
docker stop japan-travel-planner-postgres
```

## Run Locally

Start both app shells:

```bash
pnpm dev
```

Or run them separately:

```bash
pnpm dev:web
pnpm dev:api
```

Target URLs:

- Web: http://localhost:5173
- API: http://localhost:3001

## Local Acceptance Flow

A practical local acceptance checklist is:

1. Open the web app and confirm the mock preview path works without the API database.
2. Submit a trip request and verify the itinerary renders in the planner board.
3. Edit activities, save the itinerary, and reopen the saved trip from the trips panel.
4. Create a public share link and confirm the read-only shared page opens correctly.
5. Export the itinerary to PDF and download the file.
6. Switch to API mode after the database and environment file are ready to validate real persistence and API-backed flows.

## Optional External Services

The app can run in a reduced mode without every provider configured:

- OpenAI is required for real itinerary generation. Without a key, the API returns a clear configuration error and the UI surfaces the failure.
- Google Maps route hints, weather summaries, and Rakuten hotel suggestions are optional. If their credentials are absent, the corresponding enrichment panels stay disabled or fall back to a no-data state rather than crashing the app.

## Production Deployment

The selected production targets are:

- Vercel for the React + Vite web app;
- Render Web Service for the Express API;
- Render PostgreSQL 16 for the managed database.

Repository-level configuration lives in [vercel.json](vercel.json) and
[render.yaml](render.yaml). Both provider projects use `main` as the production
branch. The checked-in Render Blueprint currently targets temporary free demo
instances. Render waits for GitHub checks to pass and runs committed Prisma
migrations as part of the API start command.

Required environment variables, free-tier lifecycle limits, first-deploy
ordering, validation, and rollback guidance are documented in
[docs/deployment.md](docs/deployment.md). Secret values must be configured in
Vercel or Render and must never be committed.

## Quality Checks

Run the usual local checks before reporting a change:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Before opening a PR, run the full stabilization validation sequence:

```bash
nvm use 24
corepack enable
corepack prepare pnpm@10.14.0 --activate

pnpm install --frozen-lockfile
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

## PR and Merge Workflow

When the documentation-only stabilization work is ready, create an independent PR with:

```bash
git add .nvmrc package.json README.md docs
git commit -m "Document stabilized local development workflow"
git push -u origin stabilize-local-toolchain-after-t33
```

Create a draft PR:

```bash
gh pr create \
  --draft \
  --base main \
  --head stabilize-local-toolchain-after-t33 \
  --title "Stabilize local development and deployment docs"
```

The PR description should note that the change only updates development environment and local deployment documentation, covers Node 24 / pnpm 10.14, documents Docker/PostgreSQL/Prisma steps, records automated and manual validation, notes the known issue that AI generation returns 500 when OpenAI is not configured, and confirms that Ticket 34 was not started.

After CI is green, merge the PR:

```bash
gh pr checks <PR_NUMBER> --watch
gh pr ready <PR_NUMBER>
gh pr merge <PR_NUMBER> --merge --delete-branch

git switch main
git pull --ff-only origin main
```

## Re-evaluating Ticket 34

Only revisit Ticket 34 after all of the following are true:

- PR #33 and the documentation stabilization PR are merged.
- CI is fully green.
- A fresh clone can follow the README and start locally without extra setup.
- PostgreSQL save/reopen/share/PDF flows have passed.
- The missing-OpenAI 500 behavior has an explicit follow-up ticket.
- A brief architecture check has been completed for the web state and API boundaries.

At that point, the core mid-term acceptance can be treated as complete, and Ticket 34 can be scoped and dependency-checked before development begins.

## Documentation

- [Production deployment](docs/deployment.md)
- [Local deployment checklist](docs/local_deployment_checklist.md)
- [Stabilization validation after T33](docs/stabilization_validation_after_t33.md)
- [Development plan](docs/development_plan.md)

## License

MIT License. See [LICENSE](LICENSE).

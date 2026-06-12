# Development Plan

This plan turns the older README vision into a staged rebuild. The guiding idea is to ship a useful web planning loop first, then add richer travel data and mobile support once the core product works.

## Product Direction

The old README described a large full-stack platform with web, mobile, backend services, AI, maps, hotels, weather, LINE sharing, persistence, and CI/CD. The new project should keep those as long-term capabilities but avoid building every integration at once.

The first milestone is a web-first trip planner where a user can generate, edit, save, and reopen an itinerary. Every later feature should improve that loop instead of becoming a disconnected demo.

## Scope Strategy

### Build First

- Web app for trip input, itinerary review, and editing.
- Backend API for itinerary generation, validation, persistence, and provider calls.
- Database model for users, trips, days, and activities.
- AI itinerary service with structured output and guardrails.
- Basic maps and weather enrichment.

### Build Later

- Hotel search and booking handoff.
- Live transit planning.
- LINE sharing.
- PDF export.
- Mobile app.
- Offline support.
- AR navigation or other experimental features.

## Recommended Architecture

Use a TypeScript monorepo so the web app, API, and future mobile app can share schemas and domain types.

```text
apps/web
  React + Vite frontend

apps/api
  Express API server

apps/mobile
  Expo app, added after the web MVP

packages/shared
  Zod schemas, API contracts, shared itinerary types

packages/config
  Shared TypeScript, ESLint, Prettier, and test config
```

Recommended baseline stack:

- Package manager: `pnpm`
- Web: React, TypeScript, Vite
- API: Node.js, TypeScript, Express
- Validation: Zod
- Database: PostgreSQL with Prisma
- AI: OpenAI API with schema-constrained responses
- Tests: Vitest, React Testing Library, Supertest, Playwright
- CI: GitHub Actions

MongoDB is still a reasonable option because itineraries are document-shaped. PostgreSQL plus Prisma is recommended for the rebuild because trips, users, activities, share links, and provider metadata are easier to query and evolve relationally.

## Data Model Draft

Core entities:

- `User`: account, email, auth provider, preferences.
- `Trip`: owner, title, date range, destination cities, budget, pace, status.
- `TripDay`: trip, date, city, summary, weather snapshot.
- `Activity`: trip day, title, category, start time, duration, location, cost level, notes, source.
- `Place`: normalized location data, map provider ID, latitude, longitude, address.
- `ProviderResult`: cached external API result for maps, weather, hotels, or routes.
- `ShareLink`: public token, permissions, expiration, trip reference.

The MVP can start without `Place` and `ProviderResult` tables if time is tight, but the API should still return activity location fields in a structured shape.

## API Draft

Initial endpoints:

```text
POST   /api/itineraries/generate
GET    /api/trips
POST   /api/trips
GET    /api/trips/:tripId
PATCH  /api/trips/:tripId
DELETE /api/trips/:tripId
POST   /api/trips/:tripId/share
GET    /api/share/:shareToken
GET    /api/health
```

Later endpoints:

```text
POST /api/trips/:tripId/enrich/maps
POST /api/trips/:tripId/enrich/weather
POST /api/trips/:tripId/enrich/hotels
POST /api/trips/:tripId/export/pdf
POST /api/integrations/line/share
```

## AI Itinerary Design

The AI layer should return structured data, not prose-only answers. The backend should validate every model response before saving or displaying it.

Recommended flow:

1. Convert user inputs into a normalized trip request.
2. Ask the model for a schema-constrained itinerary.
3. Validate with Zod.
4. Repair or retry invalid responses once.
5. Enrich valid activities with maps, weather, or provider metadata.
6. Save the final itinerary as editable application data.

The first prompt should prioritize realistic pacing, travel time awareness, city grouping, dietary or accessibility constraints, and avoiding overfilled days.

## Milestones

### Phase 0: Repository Foundation

Deliverables:

- `README.md`
- `docs/development_plan.md`
- `LICENSE`
- `.gitignore`
- `.env.example`
- Monorepo package setup
- Shared TypeScript, lint, format, and test scripts

Acceptance criteria:

- A new developer can install dependencies and run placeholder web/API apps.
- CI can run lint, typecheck, and tests.

### Phase 1: Web MVP Shell

Deliverables:

- Trip intake form.
- Itinerary results layout.
- Editable day/activity UI.
- Loading, empty, error, and validation states.
- Local mock itinerary data.

Acceptance criteria:

- A user can fill out a trip request and see a mock itinerary.
- The itinerary can be edited in the browser without a backend.
- UI works on desktop and mobile breakpoints.

### Phase 2: API And Persistence

Deliverables:

- Express API with health check.
- Database schema and migrations.
- Trip CRUD endpoints.
- Request validation and error format.
- Basic auth strategy or local anonymous session strategy.

Acceptance criteria:

- Trips can be created, read, updated, and deleted through the API.
- Invalid requests return clear validation errors.
- API tests cover happy paths and validation failures.

### Phase 3: AI Itinerary Generation

Deliverables:

- OpenAI service wrapper.
- Itinerary generation endpoint.
- Structured output schema.
- Prompt templates and retry/repair handling.
- Token and cost logging.

Acceptance criteria:

- A real trip request produces a validated itinerary.
- Invalid AI responses are rejected or repaired before reaching the client.
- The app has a fallback error state when AI generation fails.

### Phase 4: Itinerary Editing

Deliverables:

- Add, edit, delete, and reorder activities.
- Save generated itinerary to a trip.
- Dirty state and optimistic update behavior.
- Activity metadata fields.

Acceptance criteria:

- User edits persist after refresh.
- Reordering activities does not corrupt day grouping.
- API and UI tests cover editing behavior.

### Phase 5: Maps And Weather

Deliverables:

- Map links for activity locations.
- Optional embedded map for daily route overview.
- Weather summary per trip day or city.
- Provider caching to reduce repeated calls.

Acceptance criteria:

- Activities have useful map context.
- Weather failures do not block itinerary use.
- Provider keys are isolated to the backend.

### Phase 6: Travel Integrations

Deliverables:

- Hotel suggestions using Rakuten Travel or a substitute provider.
- Route or transit hints using Google Maps Platform or another routing provider.
- Provider abstraction layer.

Acceptance criteria:

- The itinerary can show accommodation and movement suggestions without hard-coding provider data into UI components.
- Provider failures degrade gracefully.

### Phase 7: Sharing And Export

Deliverables:

- Public read-only share links.
- PDF export.
- Optional LINE sharing flow.

Acceptance criteria:

- A shared trip can be opened without exposing private editing access.
- Exported itinerary is readable and includes dates, activities, locations, and notes.

### Phase 8: Mobile App

Deliverables:

- Expo app scaffold.
- Shared API client and itinerary types.
- Mobile trip list and itinerary views.
- Basic offline read cache.

Acceptance criteria:

- Saved trips can be viewed on mobile.
- The mobile app shares core domain types with the web app.

### Phase 9: Production Readiness

Deliverables:

- GitHub Actions CI.
- Deployment setup for web, API, and database.
- Secrets management.
- Rate limiting and basic abuse controls.
- Observability for API errors and AI costs.

Acceptance criteria:

- Main branch can deploy reliably.
- Runtime errors and AI provider failures are visible.
- Environment setup is documented.

## Suggested Sprint Order

1. Week 1: Monorepo scaffold, tooling, README, dev plan, placeholder apps.
2. Week 2: Web trip intake and mock itinerary UI.
3. Week 3: API, database schema, trip CRUD.
4. Week 4: AI itinerary generation and validation.
5. Week 5: Editing, saving, and shareable trip view.
6. Week 6: Maps, weather, polish, tests, and deployment.

Hotels, transit, mobile, LINE, and PDF export should be scheduled after the MVP proves the core planner is useful.

## Testing Plan

- Unit tests for validation schemas and itinerary normalization.
- API tests for trip CRUD, generation, and error behavior.
- Component tests for trip intake and itinerary editing.
- End-to-end tests for generating, editing, saving, and reopening a trip.
- Provider contract tests with mocked maps, weather, hotel, and AI responses.

## Quality Gates

Before each merge:

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm test:e2e` for changes touching core user flows

Before launch:

- Validate mobile and desktop layouts.
- Test empty, loading, error, and provider outage states.
- Confirm API keys never ship to the client bundle.
- Confirm generated itineraries are saved as editable structured data.
- Add rate limits around AI and provider-heavy endpoints.

## Open Decisions

- Choose PostgreSQL or MongoDB before Phase 2.
- Decide whether MVP auth uses full accounts, magic links, or anonymous local trips.
- Decide whether maps are embedded in the MVP or shown as external map links first.
- Choose the weather provider based on data access and licensing.
- Decide whether hotel search is a direct integration or a curated external handoff.

## Risks And Mitigations

- AI output may be unrealistic: validate structure, cap activities per day, and add prompt rules for pacing.
- Provider APIs may be expensive or rate-limited: cache provider results and isolate integrations behind backend services.
- Scope may expand too early: protect the MVP planning loop and defer mobile/integration-heavy work.
- External data may be incomplete: make enrichment optional and keep the itinerary usable without it.
- Secret leakage risk: keep all provider calls on the backend and audit client environment variables.

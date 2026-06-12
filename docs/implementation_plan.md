# Implementation Ticket List

This ticket list translates `README.md` and `docs/development_plan.md` into concrete implementation work. It follows the documented order: repository foundation, web MVP, API and persistence, AI generation, editing, maps/weather, sharing/export, integrations, mobile, and production readiness.

Complexity scale: `S` = small, `M` = medium, `L` = large.

Risk scale: `Low`, `Medium`, `High`.

## Phase 0: Foundation

### T-001: Finalize MVP Technical Decisions

- Goal: Decide the first-build choices that block scaffolding: database, auth/session model, map display approach, weather provider, and hotel integration strategy.
- Files likely involved:
  - `docs/architecture_decisions.md`
  - `README.md`
  - `docs/development_plan.md`
- Dependencies: None.
- Acceptance criteria:
  - Database choice is recorded.
  - MVP auth/session approach is recorded.
  - MVP map approach is recorded as either external links or embedded maps.
  - Weather provider is selected for MVP.
  - Hotel integration strategy is marked as direct API, external handoff, or deferred.
- Tests to add or run:
  - Documentation review only.
- Risk level: Medium.
- Estimated complexity: S.

### T-002: Scaffold TypeScript Monorepo

- Goal: Create the monorepo structure described in the README and development plan.
- Files likely involved:
  - `package.json`
  - `pnpm-workspace.yaml`
  - `tsconfig.base.json`
  - `apps/web/package.json`
  - `apps/api/package.json`
  - `packages/shared/package.json`
  - `packages/config/package.json`
- Dependencies: T-001.
- Acceptance criteria:
  - `pnpm install` succeeds.
  - Workspace packages are recognized by `pnpm`.
  - Root scripts exist for `dev`, `lint`, `typecheck`, and `test`.
  - Empty or placeholder web/API packages can be addressed from root scripts.
- Tests to add or run:
  - `pnpm install`
  - `pnpm typecheck`
- Risk level: Medium.
- Estimated complexity: M.

### T-003: Add Baseline Repository Files

- Goal: Add standard project files needed before active development.
- Files likely involved:
  - `.gitignore`
  - `.env.example`
  - `LICENSE`
  - `README.md`
  - `docs/development_plan.md`
- Dependencies: T-002.
- Acceptance criteria:
  - `.env.example` includes all planned environment variables from the README.
  - `.gitignore` excludes dependencies, build output, local env files, logs, and test artifacts.
  - `LICENSE` exists and matches the MIT license stated in the README.
  - README setup instructions match the actual monorepo scripts.
- Tests to add or run:
  - Documentation review.
  - `pnpm lint` if linting is available.
- Risk level: Low.
- Estimated complexity: S.

### T-004: Configure Shared Tooling

- Goal: Establish shared TypeScript, ESLint, Prettier, and test configuration for all packages.
- Files likely involved:
  - `packages/config/tsconfig/*.json`
  - `packages/config/eslint/*`
  - `packages/config/prettier/*`
  - `packages/config/vitest/*`
  - `eslint.config.*`
  - `prettier.config.*`
  - `vitest.config.*`
- Dependencies: T-002.
- Acceptance criteria:
  - Web, API, and shared package can use the same baseline TypeScript rules.
  - Lint and format commands work from the repository root.
  - Test command can run without failing because no tests exist yet.
- Tests to add or run:
  - `pnpm lint`
  - `pnpm typecheck`
  - `pnpm test`
- Risk level: Medium.
- Estimated complexity: M.

### T-005: Add Shared Domain Schemas And Types

- Goal: Define the initial trip request, itinerary, trip day, activity, location, and API error schemas.
- Files likely involved:
  - `packages/shared/src/schemas/tripRequest.ts`
  - `packages/shared/src/schemas/itinerary.ts`
  - `packages/shared/src/schemas/apiError.ts`
  - `packages/shared/src/types/*.ts`
  - `packages/shared/src/index.ts`
  - `packages/shared/src/**/*.test.ts`
- Dependencies: T-004.
- Acceptance criteria:
  - Trip request schema includes dates, cities, interests, pace, budget, and constraints.
  - Itinerary schema includes days and structured activities.
  - Activity schema includes title, category, timing, duration, location, cost level, and notes.
  - API error schema is reusable by web and API.
  - Schemas infer TypeScript types.
- Tests to add or run:
  - Unit tests for valid and invalid trip requests.
  - Unit tests for valid and invalid itinerary payloads.
  - `pnpm test --filter @japan-travel-planner/shared`
  - `pnpm typecheck`
- Risk level: Medium.
- Estimated complexity: M.

### T-006: Add GitHub Actions CI

- Goal: Add CI for install, lint, typecheck, and tests.
- Files likely involved:
  - `.github/workflows/ci.yml`
  - `package.json`
  - `pnpm-lock.yaml`
- Dependencies: T-004.
- Acceptance criteria:
  - CI runs on pull requests and pushes to `main`.
  - CI installs with pnpm.
  - CI runs lint, typecheck, and tests.
  - CI can be extended later for E2E and deployment.
- Tests to add or run:
  - Run the same commands locally:
    - `pnpm lint`
    - `pnpm typecheck`
    - `pnpm test`
- Risk level: Low.
- Estimated complexity: S.

## Phase 1: Web MVP Shell

### T-007: Scaffold React + Vite Web App

- Goal: Create the initial web app that runs at the planned local URL.
- Files likely involved:
  - `apps/web/package.json`
  - `apps/web/index.html`
  - `apps/web/src/main.tsx`
  - `apps/web/src/App.tsx`
  - `apps/web/src/styles/*`
  - `apps/web/vite.config.ts`
  - `apps/web/tsconfig.json`
- Dependencies: T-002, T-004.
- Acceptance criteria:
  - `pnpm dev --filter web` starts the web app.
  - Web app runs at `http://localhost:5173`.
  - App shell is responsive on desktop and mobile widths.
  - App shell does not require backend availability.
- Tests to add or run:
  - Web smoke test for app render.
  - `pnpm typecheck`
  - `pnpm test`
- Risk level: Low.
- Estimated complexity: M.

### T-008: Build Trip Intake Form With Mock Submit

- Goal: Let users enter the MVP trip inputs before generation exists.
- Files likely involved:
  - `apps/web/src/features/trip-intake/TripIntakeForm.tsx`
  - `apps/web/src/features/trip-intake/tripIntakeForm.test.tsx`
  - `apps/web/src/features/trip-intake/formState.ts`
  - `packages/shared/src/schemas/tripRequest.ts`
- Dependencies: T-005, T-007.
- Acceptance criteria:
  - Form captures date range, cities, interests, pace, budget, and constraints.
  - Client-side validation uses shared schemas or schema-compatible rules.
  - Submit displays a generated mock itinerary state.
  - Form has loading, validation, and empty-state behavior.
- Tests to add or run:
  - Component tests for required fields.
  - Component tests for valid submit.
  - Component tests for validation errors.
  - `pnpm test --filter web`
- Risk level: Medium.
- Estimated complexity: M.

### T-009: Add Mock Itinerary Fixture

- Goal: Provide realistic mock itinerary data for UI development and tests.
- Files likely involved:
  - `apps/web/src/mocks/mockItinerary.ts`
  - `packages/shared/src/schemas/itinerary.ts`
  - `apps/web/src/mocks/mockTripRequest.ts`
- Dependencies: T-005.
- Acceptance criteria:
  - Mock itinerary validates against the shared itinerary schema.
  - Mock data includes multiple days and multiple activities per day.
  - Activities include location, time, duration, cost level, category, and notes.
- Tests to add or run:
  - Unit test asserting mock data passes schema validation.
  - `pnpm test --filter web`
  - `pnpm test --filter @japan-travel-planner/shared`
- Risk level: Low.
- Estimated complexity: S.

### T-010: Build Itinerary Results Layout

- Goal: Display a day-by-day itinerary board from structured data.
- Files likely involved:
  - `apps/web/src/features/itinerary/ItineraryView.tsx`
  - `apps/web/src/features/itinerary/TripDayPanel.tsx`
  - `apps/web/src/features/itinerary/ActivityCard.tsx`
  - `apps/web/src/features/itinerary/ItinerarySummary.tsx`
  - `apps/web/src/features/itinerary/*.test.tsx`
- Dependencies: T-007, T-009.
- Acceptance criteria:
  - Days render in chronological order.
  - Activities render with title, time, duration, location, cost level, category, and notes.
  - Layout works on mobile and desktop breakpoints.
  - Empty itinerary and loading states are visible and useful.
- Tests to add or run:
  - Component tests for rendering days and activities.
  - Component tests for empty and loading states.
  - Visual/manual browser check at desktop and mobile widths.
- Risk level: Medium.
- Estimated complexity: M.

### T-011: Add Client-Side Itinerary Editing

- Goal: Allow users to add, edit, delete, and reorder activities in the browser before backend persistence exists.
- Files likely involved:
  - `apps/web/src/features/itinerary/editing/useItineraryEditor.ts`
  - `apps/web/src/features/itinerary/editing/ActivityEditorDialog.tsx`
  - `apps/web/src/features/itinerary/editing/ReorderControls.tsx`
  - `apps/web/src/features/itinerary/ActivityCard.tsx`
  - `apps/web/src/features/itinerary/editing/*.test.tsx`
- Dependencies: T-010.
- Acceptance criteria:
  - User can add an activity to a day.
  - User can edit activity metadata.
  - User can delete an activity.
  - User can reorder activities within a day.
  - Reordering does not move activities to the wrong day.
  - Dirty state is visible when local edits exist.
- Tests to add or run:
  - Unit tests for editor state reducer/hook.
  - Component tests for add/edit/delete/reorder.
  - `pnpm test --filter web`
- Risk level: Medium.
- Estimated complexity: L.

### T-012: Add Web MVP E2E Mock Flow

- Goal: Protect the first complete user loop with an E2E test using mock data.
- Files likely involved:
  - `apps/web/e2e/trip-planning.spec.ts`
  - `apps/web/playwright.config.ts`
  - `package.json`
- Dependencies: T-008, T-010, T-011.
- Acceptance criteria:
  - E2E test fills out the trip form.
  - E2E test sees a mock itinerary.
  - E2E test edits at least one activity.
  - E2E test passes in CI or is wired for later CI activation.
- Tests to add or run:
  - `pnpm test:e2e --filter web`
  - `pnpm lint`
  - `pnpm typecheck`
- Risk level: Medium.
- Estimated complexity: M.

## Phase 2: API And Persistence

### T-013: Scaffold Express API App

- Goal: Create the API service with health check, shared validation access, and local dev setup.
- Files likely involved:
  - `apps/api/package.json`
  - `apps/api/src/server.ts`
  - `apps/api/src/app.ts`
  - `apps/api/src/routes/health.ts`
  - `apps/api/src/config/env.ts`
  - `apps/api/src/**/*.test.ts`
- Dependencies: T-002, T-004, T-005.
- Acceptance criteria:
  - API starts at `http://localhost:3001`.
  - `GET /api/health` returns a healthy response.
  - Environment config validates required values.
  - API can import shared schemas.
- Tests to add or run:
  - Supertest health check.
  - `pnpm test --filter api`
  - `pnpm typecheck`
- Risk level: Low.
- Estimated complexity: M.

### T-014: Add Database And Migration Setup

- Goal: Add the selected database client, schema, and migration workflow.
- Files likely involved:
  - `apps/api/prisma/schema.prisma`
  - `apps/api/prisma/migrations/*`
  - `apps/api/src/db/client.ts`
  - `apps/api/src/db/seed.ts`
  - `.env.example`
  - `package.json`
- Dependencies: T-001, T-013.
- Acceptance criteria:
  - Database schema models users, trips, trip days, activities, share links, and optional provider results.
  - Migration command is documented and runnable.
  - Local database connection uses `DATABASE_URL`.
  - Seed or fixture workflow exists for local development.
- Tests to add or run:
  - Migration dry run or local migration.
  - Database connection smoke test.
  - `pnpm typecheck`
- Risk level: High.
- Estimated complexity: L.

### T-015: Implement API Error And Validation Middleware

- Goal: Standardize request validation and error responses across the API.
- Files likely involved:
  - `apps/api/src/middleware/validateRequest.ts`
  - `apps/api/src/middleware/errorHandler.ts`
  - `apps/api/src/errors/*`
  - `packages/shared/src/schemas/apiError.ts`
  - `apps/api/src/**/*.test.ts`
- Dependencies: T-005, T-013.
- Acceptance criteria:
  - Invalid request bodies return structured validation errors.
  - Unexpected errors return safe structured responses.
  - API does not leak stack traces in non-development mode.
  - Error format matches shared API error schema.
- Tests to add or run:
  - Unit tests for validation middleware.
  - API tests for bad request and internal error behavior.
  - `pnpm test --filter api`
- Risk level: Medium.
- Estimated complexity: M.

### T-016: Implement Trip CRUD API

- Goal: Support creating, reading, updating, and deleting saved trips.
- Files likely involved:
  - `apps/api/src/routes/trips.ts`
  - `apps/api/src/services/tripService.ts`
  - `apps/api/src/repositories/tripRepository.ts`
  - `apps/api/src/db/client.ts`
  - `packages/shared/src/schemas/itinerary.ts`
  - `packages/shared/src/schemas/tripRequest.ts`
  - `apps/api/src/routes/trips.test.ts`
- Dependencies: T-014, T-015.
- Acceptance criteria:
  - `GET /api/trips` lists trips for the current session/user.
  - `POST /api/trips` creates a trip with structured itinerary data.
  - `GET /api/trips/:tripId` returns a trip.
  - `PATCH /api/trips/:tripId` updates editable trip data.
  - `DELETE /api/trips/:tripId` deletes or archives a trip.
  - Validation failures produce clear errors.
- Tests to add or run:
  - API tests for each CRUD route.
  - API tests for invalid payloads.
  - API tests for missing trip IDs.
  - `pnpm test --filter api`
- Risk level: High.
- Estimated complexity: L.

### T-017: Add MVP Auth Or Anonymous Session Strategy

- Goal: Tie trips to a safe owner model without overbuilding auth.
- Files likely involved:
  - `apps/api/src/auth/*`
  - `apps/api/src/middleware/session.ts`
  - `apps/api/src/routes/trips.ts`
  - `apps/web/src/lib/session/*`
  - `.env.example`
  - `apps/api/prisma/schema.prisma`
- Dependencies: T-001, T-014, T-016.
- Acceptance criteria:
  - Trips are scoped to a user or anonymous session.
  - Users cannot access another owner/session's private trip by ID.
  - Session strategy is documented in code and environment config.
  - Auth/session choice does not block public share links later.
- Tests to add or run:
  - API tests for trip ownership access.
  - API tests for unauthenticated or anonymous session behavior.
  - `pnpm test --filter api`
- Risk level: High.
- Estimated complexity: L.

### T-018: Connect Web App To Trip API

- Goal: Replace mock-only persistence with real trip API calls.
- Files likely involved:
  - `apps/web/src/lib/api/client.ts`
  - `apps/web/src/features/trips/useTrips.ts`
  - `apps/web/src/features/itinerary/editing/useItineraryEditor.ts`
  - `apps/web/src/features/trip-intake/TripIntakeForm.tsx`
  - `apps/web/src/features/itinerary/ItineraryView.tsx`
- Dependencies: T-016, T-017.
- Acceptance criteria:
  - Web app can save a trip through the API.
  - Web app can reopen a saved trip.
  - API errors show useful UI feedback.
  - Mock mode remains available for local UI tests if useful.
- Tests to add or run:
  - Component tests with mocked API client.
  - E2E test for save and reopen using test API/database.
  - `pnpm test --filter web`
  - `pnpm test:e2e --filter web`
- Risk level: High.
- Estimated complexity: L.

## Phase 3: AI Itinerary Generation

### T-019: Add OpenAI Service Wrapper

- Goal: Create a backend-only wrapper for OpenAI calls and configuration.
- Files likely involved:
  - `apps/api/src/providers/openai/openaiClient.ts`
  - `apps/api/src/providers/openai/openaiConfig.ts`
  - `apps/api/src/providers/openai/openaiClient.test.ts`
  - `apps/api/src/config/env.ts`
  - `.env.example`
- Dependencies: T-013, T-015.
- Acceptance criteria:
  - API reads `OPENAI_API_KEY` from server environment only.
  - Missing key fails clearly when AI generation is used.
  - Wrapper can be mocked in tests.
  - No OpenAI key is exposed to the web bundle.
- Tests to add or run:
  - Unit tests for missing and present configuration.
  - Typecheck to confirm no client import path references server provider.
  - `pnpm test --filter api`
- Risk level: Medium.
- Estimated complexity: M.

### T-020: Implement Itinerary Prompt And Structured Output Contract

- Goal: Define the prompt template and model response schema for itinerary generation.
- Files likely involved:
  - `apps/api/src/services/aiItinerary/prompt.ts`
  - `apps/api/src/services/aiItinerary/schema.ts`
  - `packages/shared/src/schemas/itinerary.ts`
  - `apps/api/src/services/aiItinerary/*.test.ts`
- Dependencies: T-005, T-019.
- Acceptance criteria:
  - Prompt includes pacing, travel-time awareness, city grouping, dietary/accessibility constraints, and activity count limits.
  - Model output maps to the shared itinerary schema.
  - Prompt and schema tests cover representative trip requests.
- Tests to add or run:
  - Unit tests for prompt construction.
  - Unit tests for schema parsing.
  - Snapshot or golden tests for prompt shape if useful.
- Risk level: High.
- Estimated complexity: M.

### T-021: Implement Generate Itinerary Endpoint

- Goal: Add `POST /api/itineraries/generate` with validation, AI call, retry/repair, and structured response.
- Files likely involved:
  - `apps/api/src/routes/itineraries.ts`
  - `apps/api/src/services/aiItinerary/generateItinerary.ts`
  - `apps/api/src/services/aiItinerary/repairItinerary.ts`
  - `apps/api/src/services/aiItinerary/generateItinerary.test.ts`
  - `packages/shared/src/schemas/tripRequest.ts`
  - `packages/shared/src/schemas/itinerary.ts`
- Dependencies: T-015, T-019, T-020.
- Acceptance criteria:
  - Valid trip request returns a validated itinerary.
  - Invalid request returns validation errors.
  - Invalid model response is retried or repaired once.
  - If generation still fails, endpoint returns a safe structured error.
  - Token and cost metadata are logged or captured.
- Tests to add or run:
  - API tests with mocked OpenAI success.
  - API tests with mocked invalid OpenAI response then repair success.
  - API tests with mocked generation failure.
  - `pnpm test --filter api`
- Risk level: High.
- Estimated complexity: L.

### T-022: Connect Web Intake To AI Generation

- Goal: Generate real itineraries from the web intake form and show fallback states.
- Files likely involved:
  - `apps/web/src/features/trip-intake/TripIntakeForm.tsx`
  - `apps/web/src/features/itinerary/ItineraryView.tsx`
  - `apps/web/src/lib/api/itineraries.ts`
  - `apps/web/src/features/itinerary/useGeneratedItinerary.ts`
- Dependencies: T-008, T-010, T-021.
- Acceptance criteria:
  - Form submit calls the generation endpoint.
  - Loading state is shown during generation.
  - Valid generated itinerary renders in the itinerary UI.
  - AI failure shows a recoverable error state.
  - User can continue editing generated activities.
- Tests to add or run:
  - Component tests with mocked success and failure API calls.
  - E2E generation flow using mocked API response.
  - `pnpm test --filter web`
  - `pnpm test:e2e --filter web`
- Risk level: High.
- Estimated complexity: L.

### T-023: Add AI Usage Logging And Guardrails

- Goal: Track AI usage and protect against runaway generation.
- Files likely involved:
  - `apps/api/src/services/aiItinerary/usageLogger.ts`
  - `apps/api/src/middleware/rateLimit.ts`
  - `apps/api/prisma/schema.prisma`
  - `apps/api/src/routes/itineraries.ts`
  - `apps/api/src/**/*.test.ts`
- Dependencies: T-014, T-021.
- Acceptance criteria:
  - Generation attempts record token/cost metadata when available.
  - Generation endpoint has basic rate limiting or abuse protection.
  - Rate limit errors use the shared API error format.
  - Logs avoid storing secret keys or sensitive raw prompt data unnecessarily.
- Tests to add or run:
  - API tests for rate-limit behavior.
  - Unit tests for usage metadata recording.
  - `pnpm test --filter api`
- Risk level: Medium.
- Estimated complexity: M.

## Phase 4: Editing And Persistence

### T-024: Persist Generated Itineraries As Trips

- Goal: Save generated itinerary output as editable trip data.
- Files likely involved:
  - `apps/api/src/services/tripService.ts`
  - `apps/api/src/routes/itineraries.ts`
  - `apps/api/src/routes/trips.ts`
  - `apps/web/src/features/itinerary/useSaveTrip.ts`
  - `apps/web/src/features/itinerary/ItineraryView.tsx`
- Dependencies: T-016, T-021, T-022.
- Acceptance criteria:
  - Generated itinerary can be saved as a trip.
  - Saved trip includes original request metadata and editable itinerary data.
  - Saved trip can be reopened after refresh.
  - Save errors are visible and recoverable in the UI.
- Tests to add or run:
  - API test for saving generated itinerary.
  - Web component test for save success/failure.
  - E2E test for generate, save, refresh, reopen.
- Risk level: High.
- Estimated complexity: L.

### T-025: Implement Optimistic Editing Against API

- Goal: Persist add/edit/delete/reorder changes while keeping the UI responsive.
- Files likely involved:
  - `apps/web/src/features/itinerary/editing/useItineraryEditor.ts`
  - `apps/web/src/features/itinerary/useSaveTrip.ts`
  - `apps/api/src/routes/trips.ts`
  - `apps/api/src/services/tripService.ts`
  - `packages/shared/src/schemas/itinerary.ts`
- Dependencies: T-011, T-018, T-024.
- Acceptance criteria:
  - Edits update the UI immediately.
  - Successful saves clear dirty state.
  - Failed saves show retry/revert behavior.
  - Reordering activities preserves trip day grouping.
  - Persisted edits survive page refresh.
- Tests to add or run:
  - Unit tests for editor state transitions.
  - API tests for patching itinerary data.
  - E2E test for editing and refresh persistence.
- Risk level: High.
- Estimated complexity: L.

## Phase 5: Maps And Weather

### T-026: Add Map Link Enrichment

- Goal: Add useful map context for activity locations without requiring embedded maps yet.
- Files likely involved:
  - `apps/api/src/providers/maps/mapsProvider.ts`
  - `apps/api/src/services/enrichment/mapEnrichment.ts`
  - `apps/api/src/routes/enrichment.ts`
  - `apps/web/src/features/itinerary/ActivityCard.tsx`
  - `.env.example`
- Dependencies: T-001, T-016, T-024.
- Acceptance criteria:
  - Activity locations can produce Google Maps links.
  - Map provider key stays on the backend.
  - Activities without exact coordinates still produce a useful search link when possible.
  - Map enrichment failure does not block itinerary display.
- Tests to add or run:
  - Unit tests for map URL generation.
  - API tests with mocked provider responses.
  - Component tests for rendered map links.
- Risk level: Medium.
- Estimated complexity: M.

### T-027: Add Weather Enrichment

- Goal: Add weather summaries per trip day or city.
- Files likely involved:
  - `apps/api/src/providers/weather/weatherProvider.ts`
  - `apps/api/src/services/enrichment/weatherEnrichment.ts`
  - `apps/api/src/routes/enrichment.ts`
  - `apps/web/src/features/itinerary/WeatherSummary.tsx`
  - `.env.example`
- Dependencies: T-001, T-016, T-024.
- Acceptance criteria:
  - Weather provider can be called from backend only.
  - Weather summary can attach to trip days or city/date pairs.
  - Weather provider failure does not block saved itinerary use.
  - UI clearly handles missing weather.
- Tests to add or run:
  - Provider contract tests with mocked weather responses.
  - API tests for weather enrichment success/failure.
  - Component tests for weather summary and missing state.
- Risk level: Medium.
- Estimated complexity: M.

### T-028: Add Provider Result Caching

- Goal: Cache map/weather provider results to reduce repeated calls and cost.
- Files likely involved:
  - `apps/api/prisma/schema.prisma`
  - `apps/api/src/repositories/providerResultRepository.ts`
  - `apps/api/src/services/enrichment/cache.ts`
  - `apps/api/src/providers/*`
- Dependencies: T-014, T-026, T-027.
- Acceptance criteria:
  - Provider results can be stored and reused.
  - Cache keys include provider, query, and relevant date/location parameters.
  - Cache has an expiration policy appropriate to weather vs maps.
  - Cached responses do not include secrets.
- Tests to add or run:
  - Unit tests for cache key creation.
  - API tests proving second request uses cache.
  - `pnpm test --filter api`
- Risk level: Medium.
- Estimated complexity: M.

## Phase 6: Sharing And Export

### T-029: Implement Public Read-Only Share Links

- Goal: Allow a saved trip to be shared without exposing edit access.
- Files likely involved:
  - `apps/api/src/routes/share.ts`
  - `apps/api/src/services/shareService.ts`
  - `apps/api/prisma/schema.prisma`
  - `apps/web/src/routes/SharedTripPage.tsx`
  - `apps/web/src/features/sharing/ShareControls.tsx`
- Dependencies: T-017, T-024.
- Acceptance criteria:
  - `POST /api/trips/:tripId/share` creates a share token.
  - `GET /api/share/:shareToken` returns read-only trip data.
  - Shared page does not expose editing controls.
  - Private trip IDs are not enough to bypass share permissions.
- Tests to add or run:
  - API tests for share creation and lookup.
  - API tests for unauthorized private trip access.
  - E2E test for opening a share link.
- Risk level: High.
- Estimated complexity: L.

### T-030: Implement PDF Export

- Goal: Export a readable itinerary with dates, activities, locations, and notes.
- Files likely involved:
  - `apps/api/src/routes/export.ts`
  - `apps/api/src/services/pdfExportService.ts`
  - `apps/web/src/features/export/ExportControls.tsx`
  - `apps/api/src/templates/itineraryPdf/*`
- Dependencies: T-024, T-029.
- Acceptance criteria:
  - Export includes trip title, dates, days, activities, locations, and notes.
  - Export works for private owner access and permitted shared access if supported.
  - PDF generation failure returns a recoverable error.
  - Output is readable on desktop and mobile PDF viewers.
- Tests to add or run:
  - API tests for PDF export route.
  - Snapshot or structural test for generated PDF content.
  - Manual PDF inspection.
- Risk level: Medium.
- Estimated complexity: M.

## Phase 7: Travel Integrations

### T-031: Add Hotel Suggestion Provider Abstraction

- Goal: Support hotel suggestions through Rakuten Travel or a substitute provider without coupling the UI to one provider.
- Files likely involved:
  - `apps/api/src/providers/hotels/hotelProvider.ts`
  - `apps/api/src/providers/hotels/rakutenHotelProvider.ts`
  - `apps/api/src/services/enrichment/hotelEnrichment.ts`
  - `apps/web/src/features/hotels/HotelSuggestions.tsx`
  - `.env.example`
- Dependencies: T-001, T-028.
- Acceptance criteria:
  - Hotel provider interface is independent of Rakuten-specific response shape.
  - Hotel suggestions can be attached to a trip or city/date range.
  - Provider failures degrade gracefully.
  - Backend owns provider keys.
- Tests to add or run:
  - Provider contract tests with mocked hotel responses.
  - API tests for hotel enrichment success/failure.
  - Component tests for suggestions and empty state.
- Risk level: Medium.
- Estimated complexity: L.

### T-032: Add Transit Or Route Hint Provider Abstraction

- Goal: Add route or transit hints using Google Maps Platform or a Japan-specific provider.
- Files likely involved:
  - `apps/api/src/providers/routes/routeProvider.ts`
  - `apps/api/src/providers/routes/googleRoutesProvider.ts`
  - `apps/api/src/services/enrichment/routeEnrichment.ts`
  - `apps/web/src/features/routes/RouteHints.tsx`
- Dependencies: T-001, T-026, T-028.
- Acceptance criteria:
  - Route provider interface can support multiple providers.
  - Route hints can be shown between activities or for day overview.
  - Missing route data does not block itinerary display.
  - UI does not hard-code provider-specific fields.
- Tests to add or run:
  - Provider contract tests with mocked route responses.
  - Unit tests for route hint normalization.
  - Component tests for route hints and missing state.
- Risk level: High.
- Estimated complexity: L.

### T-033: Add Optional LINE Sharing Flow

- Goal: Support sharing a trip through LINE after public share links exist.
- Files likely involved:
  - `apps/api/src/routes/integrations/line.ts`
  - `apps/api/src/services/lineShareService.ts`
  - `apps/web/src/features/sharing/LineShareButton.tsx`
  - `.env.example`
- Dependencies: T-029.
- Acceptance criteria:
  - LINE sharing uses a public read-only share URL.
  - Missing LINE configuration hides or disables the feature safely.
  - LINE provider errors do not affect regular share links.
- Tests to add or run:
  - Unit tests for LINE share URL/message creation.
  - Component tests for enabled/disabled states.
  - API tests if server-side LINE calls are used.
- Risk level: Medium.
- Estimated complexity: M.

## Phase 8: Mobile App

### T-034: Scaffold Expo Mobile App

- Goal: Add the future mobile app using shared API client/types after the web MVP is stable.
- Files likely involved:
  - `apps/mobile/package.json`
  - `apps/mobile/app.json`
  - `apps/mobile/src/App.tsx`
  - `apps/mobile/src/screens/TripListScreen.tsx`
  - `apps/mobile/src/screens/TripDetailScreen.tsx`
  - `packages/shared/src/index.ts`
- Dependencies: T-024, T-029.
- Acceptance criteria:
  - Expo app starts locally.
  - Mobile app can import shared itinerary types.
  - Mobile app can display a saved trip list and trip detail using API data or mock API data.
  - Mobile app does not duplicate domain schemas.
- Tests to add or run:
  - Mobile typecheck.
  - Basic render tests if test stack is configured.
  - Manual Expo smoke test.
- Risk level: Medium.
- Estimated complexity: L.

### T-035: Add Mobile Offline Read Cache

- Goal: Cache saved trips for read-only mobile access when offline.
- Files likely involved:
  - `apps/mobile/src/storage/offlineTrips.ts`
  - `apps/mobile/src/api/mobileApiClient.ts`
  - `apps/mobile/src/screens/TripDetailScreen.tsx`
  - `apps/mobile/src/screens/TripListScreen.tsx`
- Dependencies: T-034.
- Acceptance criteria:
  - Recently opened trips are available without network access.
  - Offline cache is read-only for MVP.
  - UI indicates cached/offline data clearly.
  - Cache handles schema/version mismatch safely.
- Tests to add or run:
  - Unit tests for cache read/write behavior.
  - Manual offline mode check.
  - Mobile typecheck.
- Risk level: Medium.
- Estimated complexity: M.

## Phase 9: Production Readiness

### T-036: Add Deployment Configuration

- Goal: Prepare deployable web, API, and database environments.
- Files likely involved:
  - `vercel.json` or hosting-specific web config
  - `render.yaml`, `fly.toml`, or GCP deployment config
  - `.github/workflows/deploy.yml`
  - `apps/api/src/config/env.ts`
  - `README.md`
- Dependencies: T-006, T-013, T-014, T-018.
- Acceptance criteria:
  - Web deployment target is selected and configured.
  - API deployment target is selected and configured.
  - Managed database target is selected and documented.
  - Required secrets are listed without exposing values.
  - Deployment can run from `main` or a documented manual flow.
- Tests to add or run:
  - Deployment dry run if provider supports it.
  - `pnpm lint`
  - `pnpm typecheck`
  - `pnpm test`
- Risk level: High.
- Estimated complexity: L.

### T-037: Add Observability And Runtime Error Reporting

- Goal: Make API errors, provider failures, and AI costs visible in production.
- Files likely involved:
  - `apps/api/src/observability/logger.ts`
  - `apps/api/src/observability/metrics.ts`
  - `apps/api/src/middleware/requestLogger.ts`
  - `apps/api/src/services/aiItinerary/usageLogger.ts`
  - `apps/web/src/lib/errorReporting.ts`
- Dependencies: T-021, T-023, T-026, T-027.
- Acceptance criteria:
  - API logs request IDs and safe error metadata.
  - Provider failures are logged with provider name and failure category.
  - AI generation cost/token metadata is queryable or visible in logs.
  - Sensitive data and API keys are never logged.
- Tests to add or run:
  - Unit tests for redaction helpers.
  - API tests confirming request ID propagation.
  - Manual log inspection in local development.
- Risk level: Medium.
- Estimated complexity: M.

### T-038: Harden Security And Abuse Controls

- Goal: Protect provider-heavy endpoints and prevent accidental secret exposure.
- Files likely involved:
  - `apps/api/src/middleware/rateLimit.ts`
  - `apps/api/src/middleware/securityHeaders.ts`
  - `apps/api/src/config/env.ts`
  - `apps/web/vite.config.ts`
  - `.env.example`
  - `.github/workflows/ci.yml`
- Dependencies: T-017, T-021, T-023, T-036.
- Acceptance criteria:
  - AI and provider-heavy endpoints have rate limits.
  - CORS allows only configured web origins.
  - Security headers are configured for API responses.
  - Client bundle does not include server-only API keys.
  - CI or review checklist includes secret leakage checks.
- Tests to add or run:
  - API tests for CORS and rate limits.
  - Build inspection for client env exposure.
  - `pnpm lint`
  - `pnpm test --filter api`
- Risk level: High.
- Estimated complexity: M.

### T-039: Add Production Smoke E2E Flow

- Goal: Validate the core user journey in a production-like environment.
- Files likely involved:
  - `apps/web/e2e/production-smoke.spec.ts`
  - `.github/workflows/ci.yml`
  - `.github/workflows/deploy.yml`
  - `apps/api/src/config/env.ts`
- Dependencies: T-024, T-026, T-027, T-036.
- Acceptance criteria:
  - Smoke test covers trip intake, generation via mocked or safe AI path, save, reopen, and share view.
  - Test can run against local or staging environment.
  - Provider failures are either mocked or explicitly tested as graceful degradation.
- Tests to add or run:
  - `pnpm test:e2e`
  - Staging smoke test after deployment.
- Risk level: Medium.
- Estimated complexity: M.

## Recommended Build Order

1. T-001 through T-006: unblock the repository and CI foundation.
2. T-007 through T-012: ship the web MVP shell with mock data.
3. T-013 through T-018: add API, database, ownership, and real persistence.
4. T-019 through T-023: add structured AI generation and guardrails.
5. T-024 through T-025: make generated itineraries persist and remain editable.
6. T-026 through T-028: enrich trips with maps, weather, and provider caching.
7. T-029 through T-030: add read-only sharing and PDF export.
8. T-031 through T-033: add hotels, routes, and LINE after the core planner is stable.
9. T-034 through T-035: add mobile app and offline read cache.
10. T-036 through T-039: finish deployment, observability, security, and production smoke tests.

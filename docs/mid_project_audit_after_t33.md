# Mid-Project Audit After Ticket 33

Audit date: 2026-07-03

Baseline reviewed: `main` after PR #32 / Ticket 33, merge commit `10920bc1c6b73c384712d328370f1e4bf97fdbd2`.

Audit branch: `mid-project-audit-after-ticket-33`

This is a documentation-only audit. No Ticket 34 work, mobile app code, offline cache, deployment configuration, production observability, schema migration, or product behavior change was started.

## 1. Executive Summary

The project is no longer just a scaffold. It is a coherent web/API MVP prototype with a TypeScript monorepo, shared schemas, a React web planner, an Express API, Prisma data modeling, OpenAI itinerary generation, enrichment providers, persistence, public share links, PDF export, and optional LINE sharing.

It is still not deployment-ready. The main gap is not feature breadth, but confidence: the most important persistence-backed flows are covered mostly by mocks and route/service tests, while local real PostgreSQL validation has repeatedly been skipped or blocked. That makes the project a strong MVP candidate, but still a prototype until the local and CI verification story includes at least one real database-backed smoke path.

Top 5 risks before continuing to mobile or deployment:

1. Local toolchain instability blocks verification. `pnpm install`, root lint/typecheck/test/build, targeted package checks, Prisma commands, and Playwright commands stalled or failed locally in this audit environment.
2. Real PostgreSQL-backed save/reopen/share/PDF flows remain under-validated. The code has good mocked coverage, but no current local DB smoke test completed.
3. Documentation is stale. `README.md` still describes a scaffolded rebuild even though the project has reached persisted AI generation, provider enrichment, sharing, PDF export, and LINE sharing.
4. Web orchestration is becoming crowded. `apps/web/src/App.tsx` now coordinates mock/API modes, generation, editing, saving, reopening, enrichment, sharing, PDF export, and LINE sharing. This will make mobile reuse harder if not stabilized first.
5. Production readiness gaps remain around runtime config, security hardening, provider operations, cache retention, and observability.

Recommendation: pause before Ticket 34. Do not start the mobile scaffold until the project has a reproducible local setup, a real DB-backed smoke test, refreshed docs, and a clearer web/API client boundary for mobile reuse.

## 2. Completed Scope Review

Monorepo/tooling:

- The repo has a pnpm workspace with `apps/web`, `apps/api`, `packages/shared`, and `packages/config`.
- Root scripts exist for dev, lint, typecheck, test, build, and E2E.
- GitHub Actions runs install, lint, typecheck, test, build, and Playwright E2E on PRs and pushes to `main`.
- Risk: local commands did not complete during this audit, and local Node was `v22.18.0` while CI uses Node 24.

Shared schemas:

- Shared Zod schemas cover trip requests, itinerary days/activities, and reusable API errors.
- `tripRequestSchema` includes dates, cities, interests, pace, budget, and constraints.
- `itinerarySchema` includes days and structured activities with timing, duration, location, cost level, category, and notes.
- Risk: API trip write validation duplicates some trip/itinerary shapes in `apps/api/src/routes/trips.ts` instead of consistently reusing or composing shared schemas.

Web app:

- The web app includes trip intake, itinerary results, client-side editing, dirty state, save/reopen, share controls, PDF export, hotel suggestions, route hints, map links, shared read-only pages, and LINE sharing.
- The app can operate in mock or API mode through `VITE_TRIP_DATA_MODE`, but the default appears to prefer API mode unless set to `mock`.
- Risk: the UI is feature-rich but crowded. Some wording, such as the hard-coded "Mock Itinerary" label in `ItinerarySummary`, no longer matches all states.

API app:

- Express app setup is coherent, with health, trip CRUD, itinerary generation, enrichment, share, and PDF routes.
- Middleware covers CORS, JSON parsing, session ownership, validation errors, and API errors.
- Risk: production hardening is still light. Secure cookies are supported at the cookie helper level, but secure-by-environment behavior and broader HTTP security headers are not yet established.

Database/persistence:

- Prisma models exist for users, trips, trip days, activities, share links, and provider cache results.
- The repository layer maps Prisma rows to API responses and supports create, list, get, update, delete, share, and export flows.
- Risk: the most important persistence flows need real database validation. Mocked route tests do not prove migration, constraints, adapter behavior, or session-cookie persistence under a real database.

AI generation:

- The API has an OpenAI wrapper, itinerary prompt builder, structured output validation/repair, usage logging, and a generation endpoint.
- Missing API key/config produces controlled behavior rather than frontend exposure of provider secrets.
- Risk: token usage and cost fields exist conceptually, but current logging appears to record mostly safe metadata, not complete cost accounting.

Edit/save/reopen loop:

- Web editing supports local changes, dirty state, save/revert patterns, and reopening saved trips.
- API persistence supports replacing itinerary days/activities during updates.
- Risk: update behavior deletes and recreates day/activity rows when days are supplied, so row IDs can churn and concurrent edit behavior is not yet robust.

Maps/weather/hotels/routes enrichment:

- Provider abstractions exist for map links, weather, hotels, and routes.
- API routes degrade safely when provider config is unavailable.
- Web UI has controls for hotels/routes and displays map/weather-style data where present.
- Risk: provider integrations are mostly mocked in tests. No real provider smoke was run during this audit.

Provider caching:

- Provider result caching normalizes cache inputs, strips obvious secret-like keys from cache identities, and stores request/response JSON with expiry.
- Risk: cache retention/pruning is not yet operationally defined, and provider response payloads may contain content that should be reviewed for retention policy.

Sharing/PDF/LINE:

- Public read-only share links exist.
- PDF export exists for private and shared access paths.
- LINE sharing is client-side and shares the public read-only URL.
- Risk: public shared responses appear to include internal trip/day/activity IDs as part of the normal trip response shape. This is not edit access, but it is more internal data than a public view strictly needs.

Tests/CI:

- The repo has schema, service, route, component, hook, and Playwright E2E tests.
- The Playwright suite covers the mock planner, mocked API generation, editing, saving/reopening, sharing, PDF export, and shared read-only page behavior through mocked network routes.
- Risk: test coverage is strong for behavior shape, but mock-heavy around the exact flows that most need real database confidence.

## 3. Ticket Boundary Audit

T29 share links:

- The implementation appears aligned with public read-only share links.
- Public shared pages avoid edit controls and use token-based access.
- Watch item: the public response shape appears to reuse full trip response IDs. This is probably acceptable for an MVP but should be revisited before deployment.

T30 PDF export:

- Private PDF export is scoped to session-owned trips.
- Shared PDF export is scoped to a public share token.
- Tests assert PDF access boundaries and avoid exposing user/session IDs.
- No evidence of unrelated product scope was found.

T31 hotel provider:

- The hotel provider is implemented through an abstraction and normalized API response, with Rakuten-style config kept backend-only.
- The frontend consumes normalized hotel suggestion data rather than raw provider keys.
- Documentation drift exists: architecture/development docs still partly describe hotel search as later/deferred.

T32 route provider:

- The route provider follows the same broad pattern as other enrichments: backend route, provider abstraction, safe unavailable behavior, and frontend display.
- The frontend consumes normalized route hint data.
- No evidence of cross-day itinerary editing or unrelated persistence behavior was introduced here.

T33 LINE sharing:

- LINE sharing appears correctly scoped to a client-side share URL action.
- It depends on an existing public read-only share link and does not introduce new backend config or LINE API calls.
- The implementation does not appear to start mobile, offline, deployment, or observability work.

Cross-ticket concerns:

- Shared abstractions are mostly coherent, but duplicated API-side validation schemas create future drift risk.
- Recent tickets added significant UI surface area, making `App.tsx` a coordination bottleneck.
- No Ticket 34+ implementation was found during this audit.

## 4. Architecture Audit

Separation between API/web/shared is generally good:

- Shared schemas and types live in `packages/shared`.
- API-only secrets and provider integrations stay under `apps/api`.
- Web API clients live under `apps/web/src/lib/api`.
- Public web code does not expose provider keys through `VITE_*` variables.

Provider abstractions are directionally consistent:

- Maps, weather, hotels, and routes all use backend-facing provider/service layers.
- Cache usage is centralized enough to avoid each provider inventing an entirely separate cache shape.
- Error degradation is generally user-safe and avoids raw provider failures where practical.

Error handling is reasonably consistent:

- API errors flow through an error handler that handles Zod errors, known API errors, invalid JSON, and generic failures.
- The web API client parses shared API error shapes.
- Risk: some user-facing UI errors can still feel generic, especially when API mode is selected without a fully running backend.

Config/env handling is acceptable for MVP:

- `.env.example` includes backend provider keys and public web variables.
- `API_PORT`, `WEB_ORIGIN`, database URL, JWT, AI, weather, Google, and Rakuten-related settings are represented.
- Risk: docs do not explain the minimum env path for mock mode, API mode, and provider-enabled mode clearly enough.

Backend-only keys appear to stay backend-only:

- No `VITE_OPENAI`, `VITE_GOOGLE`, `VITE_RAKUTEN`, or `VITE_OPENWEATHER` style provider secret was found.
- `VITE_API_BASE_URL` and `VITE_TRIP_DATA_MODE` are appropriate public variables.

Shared schemas are used well but not perfectly:

- Core trip request and itinerary schemas exist and are tested.
- Some API route-level schemas duplicate shapes instead of importing or composing shared contracts.

Mobile readiness:

- Mobile can be added from a repo structure standpoint.
- Product-state reuse is not ready enough. The web app needs clearer boundaries around planner state, API calls, and persistence flows before mobile code is added without duplication.

MVP complexity:

- The app is still manageable, but close to the point where feature coordination in one top-level component will slow new work.
- This is not over-engineered on the backend; the provider abstraction and caching are justified by the scope already implemented.

## 5. Data Model / Prisma Audit

Trip/User/TripDay/Activity/ShareLink/ProviderResult consistency:

- The schema models anonymous users, trips, ordered days, ordered activities, share links, and cached provider results.
- Unique constraints on trip day dates/order and activity order are appropriate for the current replace-style update model.
- `ShareLink` and `ProviderResult` are natural additions for Tickets 28-33.

Migrations:

- Prisma schema and migrations appear to exist for the current model.
- This audit did not successfully run `prisma validate`, `prisma generate`, or a migration against a real database due local dependency/tooling failures.

Generated itinerary persistence and editing model:

- Itineraries can be stored as structured days and activities.
- Updating a trip by replacing days is simple and acceptable for MVP.
- Risk: destructive replacement of days/activities can churn IDs and does not support conflict detection. This is fine before collaboration, but should be documented.

Share/public read-only access:

- Share tokens are high entropy and route access is token-based.
- Shared page behavior is read-only from the web side.
- Risk: public shared data likely includes internal IDs. It does not expose session/user IDs, but public response minimization should be reviewed before deployment.

Provider cache storage:

- Cache keys avoid obvious secret-like values.
- Cached response JSON may still contain provider-provided content. Retention, pruning, and privacy review are still needed.

DB-backed flow verification:

- This remains the most urgent gap. The route and service tests are useful, but they do not replace a real Postgres pass through Prisma migrations, session cookies, trip save/reopen, share link creation, shared page access, and PDF export.
- During this audit, Docker was installed but the Docker daemon was not reachable, so no real local PostgreSQL smoke test was completed.

## 6. API Contract Audit

Health:

- `GET /api/health` exists and returns a stable health shape.

Trip CRUD:

- Private trip routes are session-owned and include create, list, read, update, delete, share, and export flows.
- Ownership is enforced through the anonymous session layer.
- Validation is present, but some write schema definitions are local to the route instead of shared.

Itinerary generation:

- Generation accepts a shared trip request shape and returns structured itinerary data.
- The route includes rate-limit style guardrails and usage logging.
- Missing OpenAI config should fail safely.

Map enrichment:

- Map link enrichment is backend-routed and provider-config aware.
- The frontend also has client-side fallback links, which is practical but means there are two map-link paths to keep understandable.

Weather enrichment:

- Weather provider abstraction and API route exist.
- Safe unavailable behavior exists when config is missing.
- Web weather display is present where day summaries exist, but a fully discoverable live weather interaction is less obvious than hotel/route controls.

Hotel enrichment:

- Hotel suggestions are normalized and backend-keyed.
- Missing provider config degrades safely.

Route hints:

- Route hints are normalized and route-scoped.
- Reorder behavior remains itinerary-edit scoped and does not appear tied to provider route hints.

Share links:

- Private share creation requires session ownership.
- Public share access is token-based.
- Shared page is read-only in the web app.

PDF export:

- Private PDF export requires ownership.
- Shared PDF export uses the share token path.
- PDF response headers are set and no user/session IDs are expected in PDF content.

General contract observations:

- Request validation is present across core routes.
- Structured error consistency is good for MVP.
- Provider errors and secrets do not appear to leak intentionally.
- Public routes should be reviewed for response minimization before production.

## 7. Web UX / State Audit

Trip intake:

- The form captures date range, cities, interests, pace, budget, and constraints.
- It has validation and loading/submitting states.
- It can submit to mock data or API generation depending on mode.

Generated results:

- Results render structured days and activities.
- Empty/loading states exist.
- The hard-coded "Mock Itinerary" label is now misleading in API/generated contexts.

Editing/dirty/revert/save:

- Client-side editing supports add, edit, delete, reorder, dirty state, save, and revert-style behavior.
- Dirty state appears after local edits.
- Optimistic save behavior is useful but needs real DB smoke validation.

Reopen saved trips:

- Saved trips can be listed/reopened through API-mode behavior.
- Risk: if API or DB setup is missing, new developers will hit errors quickly unless mock mode is clearly documented.

Share controls:

- Share controls depend on saved state and public share URL creation.
- Existing share links are not prominently discoverable after reload until the user interacts with share creation again.

PDF export controls:

- PDF export exists for private and shared flows.
- Behavior should be covered in a real DB smoke because it depends on saved data and route access.

LINE sharing:

- LINE sharing uses a public URL, opens LINE share, and does not use a LINE API key.
- The URL content is appropriate: public link plus short trip context.

Hotel suggestions, route hints, weather, and map display:

- Hotel and route panels are useful but add density.
- Map links are pragmatic.
- Weather display exists where itinerary data includes weather.
- Before mobile, these panels should likely be collapsed, grouped, or redesigned for compact screens.

Shared read-only page:

- The shared route renders itinerary content without edit controls.
- Export is still available through the shared PDF route.

Usability:

- The UI is usable for an MVP, but too crowded to carry directly into mobile without pruning or reshaping.
- Error states are present but could better distinguish missing backend, missing provider key, and real provider failure.
- Mock/API mode is not obvious enough for a new developer or evaluator.

## 8. Test Quality Audit

Unit tests:

- Shared schema tests are high value and cover valid/invalid payloads.
- Utility tests around form state, API clients, and provider normalization are useful.

Service tests:

- AI prompt/schema/repair, provider services, provider cache, PDF, share, and usage logging have focused tests.
- These are good for preventing regressions in business rules.

Route/API tests:

- Supertest-style API route tests cover important request/response behavior and ownership checks.
- They use fake repositories/providers/cache in many places, which is appropriate for route-level isolation.
- Risk: they do not prove Prisma migrations, constraints, adapter behavior, or real DB data shape.

Component tests:

- Web components and flows have meaningful coverage for form validation, itinerary rendering, editing, enrichment panels, share controls, and API client behavior.
- Some tests assert rendered HTML or detailed implementation shape tightly, but this is not currently a blocking concern.

Playwright E2E:

- The E2E suite is high value because it covers an end-to-end user story across trip intake, itinerary viewing, editing, sharing, PDF, and shared read-only pages.
- It is heavily mocked at the network layer, so it protects UX flow but not backend integration.

CI checks:

- CI is configured to run install, lint, typecheck, test, build, Playwright browser install, and E2E.
- CI should remain the main signal while local tooling is unstable, but it cannot replace a documented local DB smoke path.

Missing or weak coverage:

- Real Postgres-backed smoke test for create/save/reopen/share/PDF.
- Real Prisma migration/generate validation in a local checklist or dedicated script.
- Provider smoke harness with live calls explicitly opt-in.
- Security hardening tests for production cookie settings and public response minimization.
- Cache retention/pruning tests or scheduled cleanup behavior.

## 9. Security / Privacy Audit

API keys and env vars:

- Provider keys are backend env vars, not public `VITE_*` variables.
- `.env.example` documents backend-only keys for OpenAI, OpenWeather, Google, and Rakuten.

JWT/session handling:

- Anonymous sessions use signed HTTP-only cookies.
- SameSite is Lax.
- Risk: production Secure cookie behavior should be enforced through environment-aware config before deployment.

Anonymous owner scoping:

- Private trip routes use session ownership.
- Tests appear to cover cross-session ownership denial.

Public share token entropy and leakage:

- Share tokens are generated with strong random bytes and URL-safe encoding.
- Public URLs can be shared intentionally.
- Risk: public route response minimization should be reviewed because internal trip/day/activity IDs may be present.

Shared page read-only behavior:

- The shared page does not expose editing controls.
- It should still be checked manually in a real browser after a DB-backed share is created.

PDF export access control:

- Private PDF export is owner-scoped.
- Shared PDF export is token-scoped.
- Tests check access behavior and avoid obvious private identifiers in generated content.

LINE share URL content:

- LINE sharing uses the public read-only URL and short trip context.
- No LINE credential is used or required.

Provider cache secret redaction:

- Cache keys normalize inputs and strip secret-like fields.
- Risk: cached response payloads still need a retention policy.

Logs and error messages:

- API error handling avoids raw stack leakage in generic errors.
- AI usage logging hashes request identifiers.
- Risk: production logging, request IDs, and operational monitoring are not in place yet.

CORS/cookie config:

- CORS uses configured web origin and credentials.
- Before deployment, CORS, secure cookies, and proxy/HTTPS assumptions need a deployment-specific review.

## 10. Local Deployment Readiness

A new developer cannot be assumed to run the project cleanly from the current docs and local state.

Validation commands attempted with repo-pinned Corepack pnpm:

| Command | Result |
| --- | --- |
| `corepack pnpm install` | Stalled after workspace scope output; interrupted. |
| `CI=true corepack pnpm install` | Stalled after workspace scope output; interrupted. |
| `CI=true corepack pnpm install --frozen-lockfile --config.confirmModulesPurge=false` | Reported lockfile up to date and already up to date, then stalled; interrupted. |
| `corepack pnpm lint` | Started `eslint .`, then stalled without diagnostics; interrupted. |
| `corepack pnpm typecheck` | Entered shared `tsc -p tsconfig.json --noEmit`, then stalled; interrupted. |
| `corepack pnpm test` | Reached shared Vitest; failed after interruption with worker startup timeout errors before tests ran. |
| `corepack pnpm build` | Entered shared build, then stalled; interrupted. |
| `corepack pnpm --filter @japan-travel-planner/api test` | Entered shared build dependency, then stalled; interrupted. |
| `corepack pnpm --filter @japan-travel-planner/api typecheck` | Entered shared build dependency, then stalled; interrupted. |
| `corepack pnpm --filter @japan-travel-planner/web test` | Started web Vitest, then stalled; interrupted. |
| `corepack pnpm --filter @japan-travel-planner/web exec tsc --noEmit` | No output before stall; interrupted. |
| `corepack pnpm --filter @japan-travel-planner/api exec prisma validate` | Failed: Prisma could not find module `effect`. |
| `corepack pnpm --filter @japan-travel-planner/api exec prisma generate` | Failed: Prisma could not find module `effect`. |
| `corepack pnpm --filter @japan-travel-planner/web exec vite build` | Reached Vite transform step, then stalled; interrupted. |
| `corepack pnpm --filter @japan-travel-planner/web test:e2e` | Failed: Playwright could not find `playwright-core/package.json`. |
| `git diff --check` | Passed. |

Optional Docker/PostgreSQL check:

- `docker --version` succeeded with Docker 27.5.1.
- `docker ps` failed because the Docker daemon was not reachable at `unix:///Users/yuxuan/.docker/run/docker.sock`.
- A real DB-backed smoke test was not completed.

Exact blockers:

- Local install/tooling appears incomplete or stuck.
- Prisma failed because `@prisma/config` could not resolve `effect`.
- Playwright failed because the `playwright-core` package link was missing.
- Local Node was `v22.18.0`, while CI uses Node 24.
- Docker was installed but not running.
- The README does not provide a current enough setup path for mock-only, API-only, DB-backed, and provider-enabled modes.

The repeated `GET /api/trips` 500 reports from prior PR work should be treated as a product risk until a clean real DB-backed smoke pass proves otherwise. It may be an environment limitation, but the current test suite does not fully close that gap.

No real OpenAI, OpenWeather, Rakuten, Google Maps/Routes, or LINE provider calls were made during this audit.

## 11. Documentation Audit

README current status:

- Stale. It still describes the project as a scaffolded rebuild with placeholder apps, but the implementation now includes persisted AI generation, editing, enrichment, sharing, PDF export, and LINE sharing.

Local development instructions:

- Incomplete for the current app.
- Needs a step-by-step path for Node 24/Corepack, pnpm install, environment setup, Docker/Postgres, Prisma generate/migrate, API health, web dev, mock mode, and API mode.

Env var documentation:

- `.env.example` is much more current than the README.
- README should explain required vs optional vars, especially `DATABASE_URL`, `JWT_SECRET`, `WEB_ORIGIN`, `API_PORT`, `OPENAI_API_KEY`, `OPENAI_MODEL`, provider keys, `VITE_API_BASE_URL`, and `VITE_TRIP_DATA_MODE`.

Architecture docs:

- Useful, but stale around hotel search and the now-implemented provider surface.
- Need an update after Tickets 29-33 to describe share/PDF/provider/LINE decisions.

Implementation plan status:

- It remains useful as ticket history.
- Next-step guidance should be amended to insert a stabilization gate before Ticket 34.

API route documentation:

- Missing as a consolidated reference.
- Should document health, trips, generation, enrichment, share, and PDF routes, including auth/session expectations and error shapes.

Deployment notes:

- Not ready.
- Need future docs for production env, secure cookies, CORS, database migration, provider keys, cache retention, and logging.

Provider key setup notes:

- Need clearer instructions for which features work without keys, which degrade safely, and which require OpenAI/OpenWeather/Google/Rakuten configuration.

Recommended docs to update before continuing:

1. Refresh `README.md` project status and feature list.
2. Add a local development checklist with Node 24, Corepack, pnpm, Docker/Postgres, Prisma, API, web, mock mode, and API mode.
3. Add API route documentation.
4. Update architecture decisions or add a short ADR for share/PDF/provider/LINE decisions.
5. Add a stabilization note to the implementation plan before Ticket 34.

## 12. Recommended Stabilization Backlog

P0: Stabilize local Corepack pnpm and Node 24 setup

- Problem: local install and checks stalled or failed.
- Evidence: `pnpm install`, lint, typecheck, test, build, Prisma, and Playwright checks did not complete; local Node was 22 while CI uses 24.
- Risk: developers cannot verify changes or reproduce CI behavior.
- Recommended fix: document/enforce Node 24, clean pnpm install flow, Corepack setup, and recovery steps for broken `node_modules` or pnpm store state.
- Suggested ticket title: Stabilize local Node and pnpm development environment.

P0: Add real PostgreSQL smoke test for persisted planner flows

- Problem: DB-backed save/reopen/share/PDF flows remain unproven locally.
- Evidence: no real DB smoke completed in this audit; Docker daemon was unavailable; route tests use fakes/mocks.
- Risk: core product behavior can pass tests while failing against Prisma/Postgres/session cookies.
- Recommended fix: add Docker Compose or a documented local Postgres command plus a smoke script covering migrate, API health, create/save/reopen/share/shared PDF.
- Suggested ticket title: Add real Postgres smoke validation for trip persistence and sharing.

P0: Refresh README and local development checklist

- Problem: docs describe a scaffold, not the current product.
- Evidence: README current status and local setup are stale after Tickets 13-33.
- Risk: new contributors and reviewers cannot run or understand the project.
- Recommended fix: update README and add a local checklist with mock, API, DB, and provider modes.
- Suggested ticket title: Refresh README and local setup docs after Ticket 33.

P1: Prepare web state/API boundaries for mobile reuse

- Problem: `App.tsx` coordinates too many planner concerns.
- Evidence: generation, editing, save/reopen, share, PDF, enrichment, mode handling, and LINE sharing are all orchestrated in the web app shell.
- Risk: Ticket 34 mobile will duplicate logic or inherit web-specific assumptions.
- Recommended fix: extract planner state and API orchestration into smaller web hooks/modules or a shared client boundary before mobile scaffolding.
- Suggested ticket title: Extract planner state boundaries before mobile scaffold.

P1: Align API write validation with shared schemas

- Problem: trip route write schemas duplicate shared shapes.
- Evidence: API routes define local trip/itinerary validation while shared schemas already exist.
- Risk: schema drift between web, shared package, and API persistence.
- Recommended fix: compose shared schemas in API route validation where practical.
- Suggested ticket title: Reuse shared schemas for trip write validation.

P1: Harden session, CORS, and production HTTP security

- Problem: MVP session/CORS behavior is adequate locally, but deployment assumptions are not explicit.
- Evidence: signed HTTP-only cookies exist; production secure cookie and security header policy are not fully documented or tested.
- Risk: accidental insecure production configuration.
- Recommended fix: enforce secure cookies in production, document proxy/HTTPS assumptions, add basic security headers, and test production env validation.
- Suggested ticket title: Harden production session and HTTP security settings.

P1: Add provider smoke harness with opt-in live calls

- Problem: provider integrations are mock-tested but not live-smoke tested.
- Evidence: no real OpenAI/OpenWeather/Rakuten/Google calls were made; tests use mocked providers.
- Risk: config or provider contract breakage may be discovered late.
- Recommended fix: add explicit opt-in smoke commands that never run by default and clearly require keys.
- Suggested ticket title: Add opt-in provider smoke tests.

P1: Add provider cache retention and pruning policy

- Problem: provider cache stores normalized request/response JSON but has no operational pruning story.
- Evidence: `ProviderResult` includes expiry fields, but no audit-confirmed cleanup path.
- Risk: stale data growth and unclear retention of provider response content.
- Recommended fix: add cleanup command or scheduled pathway plus retention docs.
- Suggested ticket title: Add provider cache retention cleanup.

P2: Clarify itinerary source labeling

- Problem: UI can label generated/API results as "Mock Itinerary".
- Evidence: `ItinerarySummary` uses a hard-coded label.
- Risk: evaluator confusion.
- Recommended fix: pass a source/status label from app state.
- Suggested ticket title: Clarify itinerary source label in results summary.

P2: Make active share links discoverable after reload

- Problem: existing share state is not clearly restored in the UI after reopening a saved trip.
- Evidence: web share link state is client-managed and creation can reuse server state.
- Risk: users may create/recreate or misunderstand existing public links.
- Recommended fix: include active share summary in trip responses or add a small fetch path.
- Suggested ticket title: Show existing active share link for saved trips.

P2: Redesign enrichment panels for compact screens

- Problem: hotel, route, weather, map, share, and PDF controls create UI density.
- Evidence: the web app is feature-rich and mobile is next.
- Risk: mobile scaffold will inherit clutter.
- Recommended fix: group or collapse enrichment controls before mobile UX work.
- Suggested ticket title: Compact enrichment controls for planner UI.

P2: Document API contracts and provider setup

- Problem: route and provider behavior is not documented in one place.
- Evidence: behavior is discoverable from code and tests, not docs.
- Risk: future mobile/API integration work will rely on code spelunking.
- Recommended fix: add an API and provider setup doc.
- Suggested ticket title: Document planner API contracts and provider configuration.

## 13. Go / No-Go Decision

Decision: no-go for Ticket 34 mobile scaffold right now.

The project should pause for stabilization. The codebase is a coherent MVP prototype, but the repeated inability to validate real DB-backed behavior is a major risk. It may be caused by local environment issues, but because the automated suite is mock-heavy around persistence flows, it is also a real product confidence gap.

Minimum checks before moving on:

1. Clean local setup on Node 24 using Corepack pnpm.
2. `pnpm install`, lint, typecheck, test, build, and web E2E complete locally or have documented CI-backed alternatives.
3. Prisma validate/generate/migrate succeeds against a local Postgres database.
4. Real DB smoke passes for create/generate or mock-save, refresh/reopen, share link creation, shared page access, private/shared PDF export, and read-only shared controls.
5. README and local development checklist are updated to match the current project.
6. Web planner state/API boundaries are reviewed before mobile code is added.

Once those checks pass, Ticket 34 can proceed with much lower risk.

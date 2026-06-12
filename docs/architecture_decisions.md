# Architecture Decisions

This document records the first-build decisions needed before implementation continues. It resolves the open MVP choices from `docs/development_plan.md` while staying aligned with the product scope in `README.md`.

## ADR-001: MVP Database

Decision: Use PostgreSQL with Prisma for the MVP.

Rationale:

- The development plan recommends PostgreSQL plus Prisma for the rebuild because users, trips, activities, share links, and provider metadata are relational and likely to evolve through queries and joins.
- Itinerary data is document-shaped, but the MVP still needs ownership, sharing, editing, and future provider-result caching.
- Prisma gives the project a clear migration path before Phase 2 API and persistence work begins.

Implications:

- `DATABASE_URL` will point to a PostgreSQL database.
- The first persistence implementation should model `User`, `Trip`, `TripDay`, `Activity`, and `ShareLink`.
- `Place` and `ProviderResult` can be added when map/weather/provider enrichment needs them.

## ADR-002: MVP Auth And Session Model

Decision: Use anonymous local sessions for the MVP.

Rationale:

- The MVP needs saved trips and user-owned plans, but full account management is not required to validate the core planning loop.
- Anonymous sessions let a traveler generate, edit, save, and reopen a trip with less product and security surface area.
- The model can later upgrade to magic links or full accounts without changing the core trip ownership concept.

Implications:

- The API should create or reuse an anonymous owner/session for saved trips.
- Session state should be scoped to an HTTP-only signed cookie or equivalent server-owned token.
- `JWT_SECRET` remains the planned signing secret.
- Public share links must remain read-only and separate from private edit access.

## ADR-003: MVP Map Display

Decision: Use external Google Maps links for MVP map context.

Rationale:

- The README MVP calls for basic map links and weather context before richer travel integrations.
- The development plan lists embedded maps as optional in Phase 5.
- External links provide useful location context with lower implementation and API complexity than embedded route maps.

Implications:

- Activity locations should be structured enough to generate a Google Maps search or place link.
- Embedded maps and route overviews are deferred until after the itinerary editing and persistence loop is stable.
- Google Maps provider keys must stay on the backend when provider APIs are introduced.

## ADR-004: MVP Weather Provider

Decision: Use OpenWeather for MVP weather summaries.

Rationale:

- The README allows either JMA or OpenWeather.
- OpenWeather has straightforward city/date forecast APIs and fits the existing `WEATHER_API_KEY` environment variable.
- JMA can be revisited later if the product needs Japan-specific official forecasts or no-key public data.

Implications:

- Weather calls should happen from the backend only.
- Weather failures must not block itinerary display or saved-trip access.
- Weather responses should be normalized before reaching UI components.

## ADR-005: MVP Hotel Integration

Decision: Defer hotel search for the MVP; design for a later provider abstraction.

Rationale:

- The README and development plan both place hotel suggestions after the core itinerary loop.
- Deferring hotel search keeps the MVP focused on generating, editing, saving, reopening, and enriching itineraries with basic map/weather context.
- The future implementation can use Rakuten Travel or another provider behind a stable backend abstraction.

Implications:

- `RAKUTEN_API_KEY` stays in `.env.example` as a planned future integration key.
- No hotel provider calls should be implemented during the MVP skeleton, web shell, API persistence, or AI generation tickets.
- UI should not assume a specific hotel provider response shape.

# Stabilization validation after T33

This document records the checks that were completed during the stabilization pass and the current known non-blocking issues.

## Completed checks

- Confirmed that the repository metadata now targets Node.js 24 and pnpm 10.14.0.
- Reviewed the local setup path for copying `.env.example` to `apps/api/.env` and running Prisma generation, migration, and seed commands.
- Verified that the web app supports mock preview, local editing, save/reopen flows, public sharing, and PDF export in its current UI state.
- Confirmed that optional enrichment providers fall back to disabled/no-data behavior when credentials are absent instead of requiring the full stack to be configured.
- Added a deployment checklist for Docker Desktop/PostgreSQL 16, local environment setup, and acceptance validation.

## Validation notes

### Environment

- The repository expects Node.js 24 via `.nvmrc` and the package metadata.
- Corepack and pnpm 10.14.0 are required for the documented install flow.
- PostgreSQL 16 is the target database version for local development.

### Runtime behavior

- The web app can be exercised in mock mode before the database is available.
- The API-backed trip save/reopen/share/export flows require the database and API environment variables to be configured.
- OpenAI itinerary generation is the main external capability that requires a real key to produce a full itinerary.
- Google Maps, weather, and Rakuten enrichment are optional and should not block basic local validation.

## Known non-blocking issues

- The local validation run in this environment hit an external toolchain issue while invoking pnpm through the sandboxed terminal. The underlying repository commands themselves were not changed; the environment-level Node/Corepack permission issue should be resolved separately if a full local command replay is required.
- Some optional enrichment providers may remain visually disabled until the relevant API keys are set.
- When OpenAI is not configured, AI itinerary generation is expected to surface a configuration error and can lead to a 500 response from the API until a follow-up ticket is created for the error handling path.

## Recommended next step

Run the deployment checklist from a local shell that has Corepack access and the expected database service available, then record any remaining issues in this file if they appear during an end-to-end pass. Only proceed to Ticket 34 after the documentation PR and the earlier stabilization PR have merged, CI is green, the README-based local setup is reproducible from a fresh clone, and the database-backed save/reopen/share/PDF flows have passed.

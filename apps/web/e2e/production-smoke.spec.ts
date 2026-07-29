import { randomUUID } from "node:crypto";

import { expect, test, type Page, type Route } from "@playwright/test";

import { mockItinerary, mockTripRequest } from "../src/mocks/index.js";

function corsHeaders(webOrigin: string) {
  return {
    "access-control-allow-credentials": "true",
    "access-control-allow-headers": "content-type",
    "access-control-allow-methods": "GET, POST, PATCH, DELETE, OPTIONS",
    "access-control-allow-origin": webOrigin
  };
}

async function fulfillOptions(route: Route, webOrigin: string) {
  await route.fulfill({
    headers: corsHeaders(webOrigin),
    status: 204
  });
}

function createUniqueItinerary() {
  const runId = randomUUID();

  return {
    ...mockItinerary,
    days: mockItinerary.days.map((day) => ({
      ...day,
      activities: day.activities.map((activity) => ({
        ...activity,
        id: `${activity.id}-${runId}`
      }))
    }))
  };
}

async function routeSafeGeneration(
  page: Page,
  webOrigin: string,
  itinerary: ReturnType<typeof createUniqueItinerary>
) {
  await page.route("**/api/itineraries/generate", async (route) => {
    if (route.request().method() === "OPTIONS") {
      await fulfillOptions(route, webOrigin);
      return;
    }

    expect(route.request().method()).toBe("POST");
    expect(route.request().postDataJSON()).toMatchObject(mockTripRequest);

    await route.fulfill({
      contentType: "application/json",
      headers: corsHeaders(webOrigin),
      json: {
        itinerary,
        metadata: {
          attempts: 1,
          estimatedCostUsd: null,
          model: "production-smoke-fixture",
          repaired: false,
          tokenUsage: null
        }
      },
      status: 200
    });
  });
}

async function routeUnavailableProviders(page: Page, webOrigin: string) {
  await page.route("**/api/enrichment/**", async (route) => {
    if (route.request().method() === "OPTIONS") {
      await fulfillOptions(route, webOrigin);
      return;
    }

    const pathname = new URL(route.request().url()).pathname;
    const body = pathname.endsWith("/hotels/suggestions")
      ? { hotelSuggestions: [], status: "unavailable" }
      : pathname.endsWith("/routes/hints")
        ? { routeHints: [], status: "unavailable" }
        : pathname.endsWith("/weather/summary")
          ? { status: "unavailable", weatherSummary: null }
          : { mapUrl: null };

    await route.fulfill({
      contentType: "application/json",
      headers: corsHeaders(webOrigin),
      json: body,
      status: 200
    });
  });
}

async function fillTripRequest(page: Page) {
  await page.getByLabel("Start date").fill(mockTripRequest.startDate);
  await page.getByLabel("End date").fill(mockTripRequest.endDate);
  await page.getByLabel("Cities").fill(mockTripRequest.cities.join(", "));
  await page.getByLabel("Interests").fill(mockTripRequest.interests.join(", "));
  await page.getByLabel("Travel pace").selectOption(mockTripRequest.pace);
  await page.getByLabel("Budget").selectOption(mockTripRequest.budget);
  await page
    .getByLabel("Constraints")
    .fill(mockTripRequest.constraints.join("\n"));
}

test("production build supports generation, persistence, reopen, and read-only sharing", async ({
  baseURL,
  page
}) => {
  if (!baseURL) {
    throw new Error("Production smoke test requires a web base URL.");
  }

  const webOrigin = new URL(baseURL).origin;
  let apiOrigin: string | null = null;
  let journeyError: unknown;
  let savedTripId: string | null = null;
  const smokeItinerary = createUniqueItinerary();

  await routeSafeGeneration(page, webOrigin, smokeItinerary);
  await routeUnavailableProviders(page, webOrigin);

  try {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "No itinerary yet" })
    ).toBeVisible();

    await page.getByRole("button", { name: "API" }).click();
    await fillTripRequest(page);
    await page.getByRole("button", { name: "Generate AI itinerary" }).click();

    await expect(
      page
        .getByLabel("Shell status")
        .getByText(smokeItinerary.title, { exact: true })
    ).toBeVisible();
    await expect(
      page.getByRole("region", { name: "Day 1: Tokyo" })
    ).toContainText(smokeItinerary.days[0]?.activities[0]?.title ?? "");

    await page.getByRole("button", { name: "Find hotels" }).click();
    await expect(
      page.getByText("Hotel suggestions are temporarily unavailable.")
    ).toBeVisible();

    await page.getByRole("button", { name: "Find route" }).click();
    await expect(
      page.getByText("Route hints are temporarily unavailable.")
    ).toBeVisible();

    const saveResponsePromise = page.waitForResponse((response) => {
      const url = new URL(response.url());

      return (
        response.request().method() === "POST" && url.pathname === "/api/trips"
      );
    });

    await page.getByRole("button", { name: "Save itinerary" }).click();

    const saveResponse = await saveResponsePromise;
    expect(saveResponse.status()).toBe(201);
    apiOrigin = new URL(saveResponse.url()).origin;

    const saveBody = (await saveResponse.json()) as {
      trip: { id: string };
    };
    savedTripId = saveBody.trip.id;

    await expect(
      page
        .getByRole("region", { name: "Save and reopen" })
        .getByRole("status")
        .getByText("Saved")
    ).toBeVisible();

    await page.reload();
    await expect(
      page.getByRole("heading", { name: "No itinerary yet" })
    ).toBeVisible();
    await page.getByRole("button", { name: "API" }).click();
    await page.getByRole("button", { name: "Refresh saved trips" }).click();
    await page.getByLabel("Saved trips").selectOption(savedTripId);
    await page.getByRole("button", { name: "Reopen trip" }).click();

    await expect(
      page.getByRole("heading", { level: 2, name: smokeItinerary.title })
    ).toBeVisible();
    await expect(
      page.getByRole("region", { name: "Day 1: Tokyo" })
    ).toContainText(smokeItinerary.days[0]?.activities[0]?.title ?? "");

    const shareResponsePromise = page.waitForResponse((response) => {
      const url = new URL(response.url());

      return (
        response.request().method() === "POST" &&
        url.pathname === `/api/trips/${savedTripId}/share`
      );
    });

    await page.getByRole("button", { name: "Create public link" }).click();

    const shareResponse = await shareResponsePromise;
    expect([200, 201]).toContain(shareResponse.status());

    const shareBody = (await shareResponse.json()) as {
      share: { token: string };
    };
    const shareUrlInput = page.getByLabel("Share URL");
    await expect(shareUrlInput).toHaveValue(
      new RegExp(`/share/${shareBody.share.token}$`)
    );

    const shareUrl = await shareUrlInput.inputValue();
    await page.goto(new URL(shareUrl).pathname);

    await expect(
      page.getByRole("heading", {
        level: 1,
        name: smokeItinerary.title
      })
    ).toBeVisible();
    await expect(
      page.getByRole("region", { name: "Day 1: Tokyo" })
    ).toContainText(smokeItinerary.days[0]?.activities[0]?.title ?? "");
    await expect(page.getByRole("button", { name: /Edit/ })).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Save itinerary" })
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Generate AI itinerary" })
    ).toHaveCount(0);
  } catch (error) {
    journeyError = error;
  }

  if (apiOrigin && savedTripId) {
    try {
      const cleanupResponse = await page.request.delete(
        `${apiOrigin}/api/trips/${savedTripId}`
      );

      if (!journeyError) {
        expect(cleanupResponse.status()).toBe(204);
      }
    } catch (error) {
      journeyError ??= error;
    }
  }

  if (journeyError) {
    throw journeyError;
  }
});

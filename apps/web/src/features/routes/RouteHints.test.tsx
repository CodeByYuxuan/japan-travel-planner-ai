import { renderToString } from "react-dom/server";
import { describe, expect, test } from "vitest";

import { RouteHints } from "./RouteHints.js";

const routeHint = {
  destination: {
    address: "4 Chome Ueno, Taito City, Tokyo",
    label: "Ameyoko lunch crawl"
  },
  destinationLabel: "Ameyoko lunch crawl",
  distanceMeters: 1200,
  durationMinutes: 14,
  id: "google-routes:ueno-ameyoko:1",
  mapUrl: "https://www.google.com/maps/dir/?api=1",
  origin: {
    address: "Uenokoen, Taito City, Tokyo",
    label: "Morning walk through Ueno Park"
  },
  originLabel: "Morning walk through Ueno Park",
  provider: "google-routes",
  sourceUpdatedAt: "2026-06-25T00:00:00.000Z",
  staticDurationMinutes: 13,
  steps: [
    {
      distanceMeters: 400,
      durationMinutes: 5,
      instruction: "Walk to Ueno Station.",
      transitLineName: null,
      travelMode: "walk" as const
    },
    {
      distanceMeters: 800,
      durationMinutes: 8,
      instruction: "Take the Ginza Line toward Asakusa.",
      transitLineName: "Tokyo Metro Ginza Line",
      travelMode: "transit" as const
    }
  ],
  summary:
    "Transit route from Morning walk through Ueno Park to Ameyoko lunch crawl, about 14 min, 1.2 km, via Tokyo Metro Ginza Line.",
  transitLineNames: ["Tokyo Metro Ginza Line"],
  travelMode: "transit" as const,
  warnings: ["Verify transfers locally before traveling."]
};

describe("RouteHints", () => {
  test("renders normalized route hints", () => {
    const html = renderToString(
      <RouteHints
        onLoadRouteHints={() => undefined}
        routeHints={[routeHint]}
        status="available"
      />
    );

    expect(html).toContain("Route hints");
    expect(html).toContain("Transit");
    expect(html).toContain(
      "Morning walk through Ueno Park to Ameyoko lunch crawl"
    );
    expect(html).toContain("14 min");
    expect(html).toContain("1.2 km");
    expect(html).toContain("Tokyo Metro Ginza Line");
    expect(html).toContain("Walk to Ueno Station.");
    expect(html).toContain("Open route map");
    expect(html).toContain("Verify transfers locally before traveling.");
  });

  test("renders an empty state", () => {
    const html = renderToString(
      <RouteHints onLoadRouteHints={() => undefined} status="empty" />
    );

    expect(html).toContain("No route hint was found for these locations.");
    expect(html).toContain("Find route");
  });

  test("renders unavailable and error states as recoverable alerts", () => {
    const unavailableHtml = renderToString(
      <RouteHints onLoadRouteHints={() => undefined} status="unavailable" />
    );
    const errorHtml = renderToString(
      <RouteHints
        errorMessage="Route enrichment is not configured."
        onLoadRouteHints={() => undefined}
        status="error"
      />
    );

    expect(unavailableHtml).toContain(
      "Route hints are temporarily unavailable."
    );
    expect(unavailableHtml).toContain('role="alert"');
    expect(errorHtml).toContain("Route enrichment is not configured.");
    expect(errorHtml).toContain('role="alert"');
  });

  test("explains why route search is disabled before an itinerary exists", () => {
    const html = renderToString(
      <RouteHints disabledReason="Create an itinerary before searching routes." />
    );

    expect(html).toContain("Create an itinerary before searching routes.");
    expect(html).toContain("disabled");
  });

  test("renders loading state", () => {
    const html = renderToString(
      <RouteHints
        onLoadRouteHints={() => undefined}
        originLabel="Morning walk through Ueno Park"
        destinationLabel="Ameyoko lunch crawl"
        status="loading"
      />
    );

    expect(html).toContain("Finding route");
    expect(html).toContain("disabled");
  });
});

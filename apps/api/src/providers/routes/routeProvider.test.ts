import { describe, expect, test, vi } from "vitest";

import {
  RouteProviderConfigurationError,
  RouteProviderError,
  type RouteHint,
  type RouteProvider
} from "./routeProvider.js";

const routeHint = {
  destination: {
    address: "4 Chome Ueno, Taito City, Tokyo",
    label: "Ameyoko lunch crawl"
  },
  destinationLabel: "Ameyoko lunch crawl",
  distanceMeters: 900,
  durationMinutes: 12,
  id: "contract-test-provider:route-1",
  mapUrl: "https://www.google.com/maps/dir/?api=1",
  origin: {
    address: "Uenokoen, Taito City, Tokyo",
    label: "Morning walk through Ueno Park"
  },
  originLabel: "Morning walk through Ueno Park",
  provider: "contract-test-provider",
  sourceUpdatedAt: "2026-06-25T00:00:00.000Z",
  staticDurationMinutes: 12,
  steps: [
    {
      distanceMeters: 900,
      durationMinutes: 12,
      instruction: "Walk toward Ueno Station.",
      transitLineName: null,
      travelMode: "walk"
    }
  ],
  summary:
    "Walk route from Morning walk through Ueno Park to Ameyoko lunch crawl, about 12 min, 900 m.",
  transitLineNames: [],
  travelMode: "walk",
  warnings: [
    "Walking and bicycle route details may be incomplete; verify locally before traveling."
  ]
} satisfies RouteHint;

describe("RouteProvider contract", () => {
  test("uses normalized route hints independent of provider response shape", async () => {
    const provider = {
      name: "contract-test-provider",
      getRouteHints: vi.fn<RouteProvider["getRouteHints"]>(async () => [
        routeHint
      ])
    } satisfies RouteProvider;

    await expect(
      provider.getRouteHints({
        destination: {
          address: "4 Chome Ueno, Taito City, Tokyo",
          label: "Ameyoko lunch crawl"
        },
        origin: {
          address: "Uenokoen, Taito City, Tokyo",
          label: "Morning walk through Ueno Park"
        },
        travelMode: "walk"
      })
    ).resolves.toEqual([
      expect.objectContaining({
        destinationLabel: "Ameyoko lunch crawl",
        originLabel: "Morning walk through Ueno Park",
        provider: "contract-test-provider",
        travelMode: "walk"
      })
    ]);
  });

  test("provides explicit error types for configuration and provider failures", () => {
    expect(new RouteProviderConfigurationError()).toMatchObject({
      message: "Route provider is not configured.",
      name: "RouteProviderConfigurationError"
    });
    expect(new RouteProviderError()).toMatchObject({
      message: "Route provider request failed.",
      name: "RouteProviderError"
    });
  });
});

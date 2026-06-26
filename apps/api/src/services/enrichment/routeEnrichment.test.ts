import { describe, expect, test, vi } from "vitest";

import {
  RouteProviderConfigurationError,
  RouteProviderError,
  type RouteHint,
  type RouteHintRequest,
  type RouteProvider
} from "../../providers/routes/routeProvider.js";
import type {
  ProviderResultRecord,
  ProviderResultRepository,
  ProviderResultWriteInput
} from "../../repositories/providerResultRepository.js";
import { createProviderResultCache } from "./cache.js";
import { createCachedRouteHints, createRouteHints } from "./routeEnrichment.js";

const routeRequest = {
  destination: {
    address: "4 Chome Ueno, Taito City, Tokyo",
    label: "Ameyoko lunch crawl"
  },
  origin: {
    address: "Uenokoen, Taito City, Tokyo",
    label: "Morning walk through Ueno Park"
  },
  travelMode: "walk"
} satisfies RouteHintRequest;

const routeHint = {
  destination: routeRequest.destination,
  destinationLabel: "Ameyoko lunch crawl",
  distanceMeters: 900,
  durationMinutes: 12,
  id: "test-route-provider:ueno-ameyoko:1",
  mapUrl: "https://www.google.com/maps/dir/?api=1",
  origin: routeRequest.origin,
  originLabel: "Morning walk through Ueno Park",
  provider: "test-route-provider",
  sourceUpdatedAt: "2026-06-25T00:00:00.000Z",
  staticDurationMinutes: 12,
  steps: [
    {
      distanceMeters: 900,
      durationMinutes: 12,
      instruction: "Walk toward Ameyoko.",
      transitLineName: null,
      travelMode: "walk"
    }
  ],
  summary:
    "Walk route from Morning walk through Ueno Park to Ameyoko lunch crawl, about 12 min, 900 m.",
  transitLineNames: [],
  travelMode: "walk",
  warnings: []
} satisfies RouteHint;

class InMemoryProviderResultRepository implements ProviderResultRepository {
  private readonly records = new Map<string, ProviderResultRecord>();
  private nextId = 1;

  async findUsable(cacheKey: string, now = new Date()) {
    const record = this.records.get(cacheKey);

    if (record === undefined || record.expiresAt <= now) {
      return null;
    }

    return structuredClone(record);
  }

  async upsert(input: ProviderResultWriteInput) {
    const timestamp = new Date("2026-06-25T00:00:00.000Z");
    const existingRecord = this.records.get(input.cacheKey);
    const record: ProviderResultRecord = {
      id: existingRecord?.id ?? `provider-result-${this.nextId++}`,
      provider: input.provider,
      operation: input.operation,
      cacheKey: input.cacheKey,
      requestHash: input.requestHash,
      requestJson: structuredClone(input.requestJson),
      responseJson: structuredClone(input.responseJson),
      expiresAt: input.expiresAt,
      createdAt: existingRecord?.createdAt ?? timestamp,
      updatedAt: timestamp
    };

    this.records.set(input.cacheKey, record);

    return structuredClone(record);
  }
}

function createProvider(
  getRouteHints: RouteProvider["getRouteHints"]
): RouteProvider {
  return {
    getRouteHints,
    name: "test-route-provider"
  };
}

describe("createRouteHints", () => {
  test("returns available route hints", async () => {
    const provider = createProvider(vi.fn(async () => [routeHint]));

    await expect(createRouteHints(routeRequest, provider)).resolves.toEqual({
      routeHints: [routeHint],
      status: "available"
    });
  });

  test("returns empty when the provider has no route", async () => {
    const provider = createProvider(vi.fn(async () => []));

    await expect(createRouteHints(routeRequest, provider)).resolves.toEqual({
      routeHints: [],
      status: "empty"
    });
  });

  test("preserves provider configuration failures for route-level handling", async () => {
    const provider = createProvider(
      vi.fn(async () => {
        throw new RouteProviderConfigurationError();
      })
    );

    await expect(createRouteHints(routeRequest, provider)).rejects.toThrow(
      RouteProviderConfigurationError
    );
  });

  test("degrades provider failures to unavailable route hints", async () => {
    const provider = createProvider(
      vi.fn(async () => {
        throw new RouteProviderError();
      })
    );

    await expect(createRouteHints(routeRequest, provider)).resolves.toEqual({
      routeHints: [],
      status: "unavailable"
    });
  });
});

describe("createCachedRouteHints", () => {
  test("reuses cached successful route hints", async () => {
    const provider = createProvider(vi.fn(async () => [routeHint]));
    const cache = createProviderResultCache(
      new InMemoryProviderResultRepository()
    );

    const firstResult = await createCachedRouteHints(
      routeRequest,
      provider,
      cache
    );
    const secondResult = await createCachedRouteHints(
      {
        destination: {
          address: "  4 Chome Ueno, Taito City, Tokyo  ",
          label: "Ameyoko lunch crawl"
        },
        maxAlternatives: 1,
        origin: {
          address: "Uenokoen, Taito City, Tokyo",
          label: "Morning walk through Ueno Park"
        },
        travelMode: "walk"
      },
      provider,
      cache
    );

    expect(firstResult).toEqual({
      routeHints: [routeHint],
      status: "available"
    });
    expect(secondResult).toEqual(firstResult);
    expect(provider.getRouteHints).toHaveBeenCalledTimes(1);
  });

  test("does not cache unavailable route provider failures", async () => {
    const provider = createProvider(
      vi
        .fn<RouteProvider["getRouteHints"]>()
        .mockRejectedValueOnce(new RouteProviderError())
        .mockResolvedValueOnce([routeHint])
    );
    const cache = createProviderResultCache(
      new InMemoryProviderResultRepository()
    );

    await expect(
      createCachedRouteHints(routeRequest, provider, cache)
    ).resolves.toEqual({
      routeHints: [],
      status: "unavailable"
    });
    await expect(
      createCachedRouteHints(routeRequest, provider, cache)
    ).resolves.toEqual({
      routeHints: [routeHint],
      status: "available"
    });
    expect(provider.getRouteHints).toHaveBeenCalledTimes(2);
  });
});

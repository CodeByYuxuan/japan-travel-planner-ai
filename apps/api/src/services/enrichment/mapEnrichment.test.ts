import { describe, expect, test, vi } from "vitest";

import type { Activity } from "@japan-travel-planner/shared";

import type { MapsProvider } from "../../providers/maps/mapsProvider.js";
import type {
  ProviderResultRecord,
  ProviderResultRepository,
  ProviderResultWriteInput
} from "../../repositories/providerResultRepository.js";
import { createProviderResultCache } from "./cache.js";
import {
  createCachedMapLink,
  enrichActivityWithMapLink,
  getActivityMapUrl
} from "./mapEnrichment.js";

const activity: Activity = {
  title: "Senso-ji morning visit",
  category: "culture",
  timing: {
    timeOfDay: "morning"
  },
  durationMinutes: 90,
  location: {
    name: "Senso-ji",
    city: "Tokyo"
  },
  costLevel: "free",
  notes: "Arrive before the busiest temple hours."
};

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

describe("map enrichment", () => {
  test("creates an activity map URL from activity location", () => {
    expect(getActivityMapUrl(activity)).toBe(
      "https://www.google.com/maps/search/?api=1&query=Senso-ji%20morning%20visit%20Senso-ji%20Tokyo"
    );
  });

  test("preserves existing activity map URLs", () => {
    const provider = {
      createSearchLink: vi.fn(() => "https://example.com/generated")
    } satisfies MapsProvider;
    const existingMapUrl = "https://www.google.com/maps/place/Senso-ji";

    expect(
      getActivityMapUrl(
        {
          ...activity,
          location: {
            ...activity.location,
            mapUrl: existingMapUrl
          }
        },
        provider
      )
    ).toBe(existingMapUrl);
    expect(provider.createSearchLink).not.toHaveBeenCalled();
  });

  test("adds a generated map URL without mutating the source activity", () => {
    const enrichedActivity = enrichActivityWithMapLink(activity);

    expect(enrichedActivity.location.mapUrl).toContain(
      "https://www.google.com/maps/search/"
    );
    expect(activity.location.mapUrl).toBeUndefined();
  });

  test("degrades gracefully when the provider fails", () => {
    const provider = {
      createSearchLink: vi.fn(() => {
        throw new Error("provider unavailable");
      })
    } satisfies MapsProvider;

    expect(getActivityMapUrl(activity, provider)).toBeNull();
    expect(enrichActivityWithMapLink(activity, provider)).toEqual(activity);
  });

  test("uses cached map links for repeated equivalent inputs", async () => {
    const provider = {
      createSearchLink: vi.fn(() => "https://example.com/maps/senso-ji")
    } satisfies MapsProvider;
    const cache = createProviderResultCache(
      new InMemoryProviderResultRepository()
    );

    const firstResult = await createCachedMapLink(
      {
        title: "Senso-ji morning visit",
        location: {
          city: "Tokyo",
          name: "Senso-ji"
        }
      },
      provider,
      cache
    );
    const secondResult = await createCachedMapLink(
      {
        title: "  senso-ji   morning visit ",
        location: {
          name: "Senso-ji",
          city: "tokyo"
        }
      },
      provider,
      cache
    );

    expect(firstResult).toBe("https://example.com/maps/senso-ji");
    expect(secondResult).toBe(firstResult);
    expect(provider.createSearchLink).toHaveBeenCalledTimes(1);
  });
});

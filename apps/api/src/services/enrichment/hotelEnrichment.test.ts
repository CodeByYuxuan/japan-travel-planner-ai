import { describe, expect, test, vi } from "vitest";

import {
  HotelProviderConfigurationError,
  HotelProviderError,
  type HotelProvider,
  type HotelSuggestion
} from "../../providers/hotels/hotelProvider.js";
import type {
  ProviderResultRecord,
  ProviderResultRepository,
  ProviderResultWriteInput
} from "../../repositories/providerResultRepository.js";
import { createProviderResultCache } from "./cache.js";
import {
  createCachedHotelSuggestions,
  createHotelSuggestions
} from "./hotelEnrichment.js";

const hotelRequest = {
  city: "Tokyo",
  endDate: "2026-04-08",
  startDate: "2026-04-06"
};

const hotelSuggestion = {
  access: "3 minutes from Tokyo Station",
  address: "1 Marunouchi, Chiyoda City, Tokyo",
  amenities: ["Wi-Fi"],
  bookingUrl: "https://example.com/hotel",
  city: "Tokyo",
  currency: "JPY",
  description: "Central hotel for rail-friendly days.",
  id: "provider:hotel-1",
  imageUrl: "https://example.com/hotel.jpg",
  latitude: 35.6812,
  longitude: 139.7671,
  mapUrl: "https://www.google.com/maps/search/?api=1&query=Tokyo",
  name: "Tokyo Station Stay",
  priceFrom: 18000,
  provider: "provider",
  rating: 4.5,
  reviewCount: 321,
  sourceUpdatedAt: null,
  tags: ["Near Tokyo Station"],
  thumbnailUrl: "https://example.com/thumb.jpg"
} satisfies HotelSuggestion;

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
  searchHotels: HotelProvider["searchHotels"]
): HotelProvider {
  return {
    name: "test-hotel-provider",
    searchHotels
  };
}

describe("createHotelSuggestions", () => {
  test("returns available hotel suggestions", async () => {
    const provider = createProvider(vi.fn(async () => [hotelSuggestion]));

    await expect(
      createHotelSuggestions(hotelRequest, provider)
    ).resolves.toEqual({
      hotelSuggestions: [hotelSuggestion],
      status: "available"
    });
  });

  test("returns empty when provider has no hotel suggestions", async () => {
    const provider = createProvider(vi.fn(async () => []));

    await expect(
      createHotelSuggestions(hotelRequest, provider)
    ).resolves.toEqual({
      hotelSuggestions: [],
      status: "empty"
    });
  });

  test("preserves provider configuration failures for route-level handling", async () => {
    const provider = createProvider(
      vi.fn(async () => {
        throw new HotelProviderConfigurationError();
      })
    );

    await expect(
      createHotelSuggestions(hotelRequest, provider)
    ).rejects.toThrow(HotelProviderConfigurationError);
  });

  test("degrades provider failures to unavailable hotel suggestions", async () => {
    const provider = createProvider(
      vi.fn(async () => {
        throw new HotelProviderError();
      })
    );

    await expect(
      createHotelSuggestions(hotelRequest, provider)
    ).resolves.toEqual({
      hotelSuggestions: [],
      status: "unavailable"
    });
  });
});

describe("createCachedHotelSuggestions", () => {
  test("reuses cached successful hotel suggestions", async () => {
    const provider = createProvider(vi.fn(async () => [hotelSuggestion]));
    const cache = createProviderResultCache(
      new InMemoryProviderResultRepository()
    );

    const firstResult = await createCachedHotelSuggestions(
      hotelRequest,
      provider,
      cache
    );
    const secondResult = await createCachedHotelSuggestions(
      {
        city: "  tokyo ",
        endDate: "2026-04-08",
        maxResults: 6,
        radiusKm: 2,
        startDate: "2026-04-06"
      },
      provider,
      cache
    );

    expect(firstResult).toEqual({
      hotelSuggestions: [hotelSuggestion],
      status: "available"
    });
    expect(secondResult).toEqual(firstResult);
    expect(provider.searchHotels).toHaveBeenCalledTimes(1);
  });

  test("does not cache unavailable hotel provider failures", async () => {
    const provider = createProvider(
      vi
        .fn()
        .mockRejectedValueOnce(new HotelProviderError())
        .mockResolvedValueOnce([hotelSuggestion])
    );
    const cache = createProviderResultCache(
      new InMemoryProviderResultRepository()
    );

    await expect(
      createCachedHotelSuggestions(hotelRequest, provider, cache)
    ).resolves.toEqual({
      hotelSuggestions: [],
      status: "unavailable"
    });
    await expect(
      createCachedHotelSuggestions(hotelRequest, provider, cache)
    ).resolves.toEqual({
      hotelSuggestions: [hotelSuggestion],
      status: "available"
    });
    expect(provider.searchHotels).toHaveBeenCalledTimes(2);
  });
});

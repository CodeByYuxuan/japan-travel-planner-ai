import { mockTrips } from "../mocks/mockTrips";
import type { OfflineTripStore } from "../storage/offlineTrips";
import { createMobileApiClient } from "./mobileApiClient";

function createCache(trips = mockTrips.slice(0, 1)) {
  const cache: OfflineTripStore = {
    cacheTrip: jest.fn(async () => undefined),
    clear: jest.fn(async () => undefined),
    readTrips: jest.fn(async () =>
      trips.map((itinerary, index) => ({
        cacheKey: `trip-${index}`,
        cachedAt: "2026-07-29T10:00:00.000Z",
        itinerary
      }))
    )
  };

  return cache;
}

describe("mobile API client", () => {
  it("uses the configured trip source while it is available", async () => {
    const cache = createCache();
    const client = createMobileApiClient({
      cache,
      isOnline: async () => true,
      source: {
        kind: "online",
        listTrips: async () => mockTrips
      }
    });

    await expect(client.listTrips()).resolves.toEqual({
      source: "online",
      trips: mockTrips
    });
    expect(cache.readTrips).not.toHaveBeenCalled();
  });

  it("falls back to cached trips when the source is unavailable", async () => {
    const cache = createCache();
    const client = createMobileApiClient({
      cache,
      isOnline: async () => true,
      source: {
        kind: "online",
        listTrips: async () => {
          throw new Error("offline");
        }
      }
    });

    await expect(client.listTrips()).resolves.toEqual({
      source: "cache",
      trips: [mockTrips[0]]
    });
  });

  it("uses cached trips without calling the source when the device is offline", async () => {
    const cache = createCache();
    const listTrips = jest.fn(async () => mockTrips);
    const client = createMobileApiClient({
      cache,
      isOnline: async () => false,
      source: {
        kind: "online",
        listTrips
      }
    });

    await expect(client.listTrips()).resolves.toEqual({
      source: "cache",
      trips: [mockTrips[0]]
    });
    expect(listTrips).not.toHaveBeenCalled();
  });

  it("caches a trip only after it is opened", async () => {
    const cache = createCache();
    const client = createMobileApiClient({
      cache,
      isOnline: async () => true
    });

    await client.listTrips();
    expect(cache.cacheTrip).not.toHaveBeenCalled();

    await client.cacheOpenedTrip(mockTrips[1]);
    expect(cache.cacheTrip).toHaveBeenCalledWith(mockTrips[1]);
  });
});

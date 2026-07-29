import type AsyncStorage from "@react-native-async-storage/async-storage";

import { mockTrips } from "../mocks/mockTrips";
import { createOfflineTripStore, offlineTripsStorageKey } from "./offlineTrips";

type StorageAdapter = Pick<
  typeof AsyncStorage,
  "getItem" | "removeItem" | "setItem"
>;

function createMemoryStorage() {
  const values = new Map<string, string>();
  const storage: StorageAdapter = {
    async getItem(key) {
      return values.get(key) ?? null;
    },
    async removeItem(key) {
      values.delete(key);
    },
    async setItem(key, value) {
      values.set(key, value);
    }
  };

  return { storage, values };
}

describe("offline trip store", () => {
  it("writes and reads a validated itinerary", async () => {
    const { storage } = createMemoryStorage();
    const store = createOfflineTripStore({
      now: () => new Date("2026-07-29T10:00:00.000Z"),
      storage
    });

    await store.cacheTrip(mockTrips[0]);

    await expect(store.readTrips()).resolves.toEqual([
      expect.objectContaining({
        cachedAt: "2026-07-29T10:00:00.000Z",
        itinerary: mockTrips[0]
      })
    ]);
  });

  it("keeps the most recently opened copy and respects the cache limit", async () => {
    const { storage } = createMemoryStorage();
    let minute = 0;
    const store = createOfflineTripStore({
      maximumTrips: 2,
      now: () => new Date(`2026-07-29T10:0${minute++}:00.000Z`),
      storage
    });
    const thirdTrip = {
      ...mockTrips[0],
      title: "Nara Day Trip"
    };

    await store.cacheTrip(mockTrips[0]);
    await store.cacheTrip(mockTrips[1]);
    await store.cacheTrip(thirdTrip);
    await store.cacheTrip(mockTrips[1]);

    const cachedTrips = await store.readTrips();

    expect(cachedTrips).toHaveLength(2);
    expect(cachedTrips.map((entry) => entry.itinerary.title)).toEqual([
      mockTrips[1].title,
      thirdTrip.title
    ]);
  });

  it("discards a cache with an unsupported version", async () => {
    const { storage, values } = createMemoryStorage();
    const store = createOfflineTripStore({ storage });

    values.set(
      offlineTripsStorageKey,
      JSON.stringify({ version: 999, trips: [] })
    );

    await expect(store.readTrips()).resolves.toEqual([]);
    expect(values.has(offlineTripsStorageKey)).toBe(false);
  });

  it("discards cached trips that no longer match the itinerary schema", async () => {
    const { storage, values } = createMemoryStorage();
    const store = createOfflineTripStore({ storage });

    values.set(
      offlineTripsStorageKey,
      JSON.stringify({
        version: 1,
        trips: [
          {
            cacheKey: "invalid",
            cachedAt: "2026-07-29T10:00:00.000Z",
            itinerary: {
              ...mockTrips[0],
              title: ""
            }
          }
        ]
      })
    );

    await expect(store.readTrips()).resolves.toEqual([]);
    expect(values.has(offlineTripsStorageKey)).toBe(false);
  });
});

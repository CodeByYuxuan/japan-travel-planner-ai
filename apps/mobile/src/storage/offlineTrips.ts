import AsyncStorage from "@react-native-async-storage/async-storage";
import { itinerarySchema, type Itinerary } from "@japan-travel-planner/shared";

export const offlineTripsStorageKey =
  "@japan-travel-planner/mobile/offline-trips";
export const offlineTripsSchemaVersion = 1;

const defaultMaximumTrips = 5;

type StorageAdapter = Pick<
  typeof AsyncStorage,
  "getItem" | "removeItem" | "setItem"
>;

export type CachedTrip = {
  cacheKey: string;
  cachedAt: string;
  itinerary: Itinerary;
};

type OfflineTripEnvelope = {
  version: number;
  trips: CachedTrip[];
};

export type OfflineTripStore = {
  cacheTrip: (trip: Itinerary) => Promise<void>;
  clear: () => Promise<void>;
  readTrips: () => Promise<CachedTrip[]>;
};

type OfflineTripStoreOptions = {
  maximumTrips?: number;
  now?: () => Date;
  storage?: StorageAdapter;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getTripCacheKey(trip: Itinerary) {
  return `${trip.startDate}:${trip.endDate}:${trip.title}`;
}

function parseEnvelope(value: string): CachedTrip[] | null {
  let parsed: unknown;

  try {
    parsed = JSON.parse(value) as unknown;
  } catch {
    return null;
  }

  if (
    !isRecord(parsed) ||
    parsed.version !== offlineTripsSchemaVersion ||
    !Array.isArray(parsed.trips)
  ) {
    return null;
  }

  const trips: CachedTrip[] = [];

  for (const entry of parsed.trips) {
    if (
      !isRecord(entry) ||
      typeof entry.cacheKey !== "string" ||
      typeof entry.cachedAt !== "string" ||
      Number.isNaN(Date.parse(entry.cachedAt))
    ) {
      return null;
    }

    const itinerary = itinerarySchema.safeParse(entry.itinerary);

    if (
      !itinerary.success ||
      entry.cacheKey !== getTripCacheKey(itinerary.data)
    ) {
      return null;
    }

    trips.push({
      cacheKey: entry.cacheKey,
      cachedAt: entry.cachedAt,
      itinerary: itinerary.data
    });
  }

  return trips;
}

export function createOfflineTripStore(
  options: OfflineTripStoreOptions = {}
): OfflineTripStore {
  const storage = options.storage ?? AsyncStorage;
  const maximumTrips = options.maximumTrips ?? defaultMaximumTrips;
  const now = options.now ?? (() => new Date());

  async function discardInvalidCache() {
    try {
      await storage.removeItem(offlineTripsStorageKey);
    } catch {
      // An unavailable storage layer should behave like an empty cache.
    }

    return [];
  }

  async function readTrips() {
    let value: string | null;

    try {
      value = await storage.getItem(offlineTripsStorageKey);
    } catch {
      return [];
    }

    if (value === null) {
      return [];
    }

    return parseEnvelope(value) ?? discardInvalidCache();
  }

  return {
    async cacheTrip(trip) {
      const itinerary = itinerarySchema.parse(trip);
      const cacheKey = getTripCacheKey(itinerary);
      const existingTrips = await readTrips();
      const nextTrips = [
        {
          cacheKey,
          cachedAt: now().toISOString(),
          itinerary
        },
        ...existingTrips.filter((entry) => entry.cacheKey !== cacheKey)
      ].slice(0, Math.max(0, maximumTrips));
      const envelope: OfflineTripEnvelope = {
        version: offlineTripsSchemaVersion,
        trips: nextTrips
      };

      await storage.setItem(offlineTripsStorageKey, JSON.stringify(envelope));
    },

    clear() {
      return storage.removeItem(offlineTripsStorageKey);
    },

    readTrips
  };
}

export const offlineTripStore = createOfflineTripStore();

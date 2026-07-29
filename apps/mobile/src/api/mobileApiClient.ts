import type { Itinerary } from "@japan-travel-planner/shared";
import * as Network from "expo-network";

import { mockTrips } from "../mocks/mockTrips";
import {
  offlineTripStore,
  type OfflineTripStore
} from "../storage/offlineTrips";

export type MobileTripDataSource = "cache" | "online" | "preview";

export type MobileTripLoadResult = {
  source: MobileTripDataSource;
  trips: Itinerary[];
};

export type MobileTripSource = {
  kind: Exclude<MobileTripDataSource, "cache">;
  listTrips: () => Promise<Itinerary[]>;
};

export type MobileApiClient = {
  cacheOpenedTrip: (trip: Itinerary) => Promise<void>;
  listTrips: () => Promise<MobileTripLoadResult>;
};

type MobileApiClientOptions = {
  cache?: OfflineTripStore;
  isOnline?: () => Promise<boolean>;
  source?: MobileTripSource;
};

const mockTripSource: MobileTripSource = {
  kind: "preview",
  async listTrips() {
    return mockTrips;
  }
};

async function getIsOnline() {
  const state = await Network.getNetworkStateAsync();

  return state.isConnected !== false && state.isInternetReachable !== false;
}

export function createMobileApiClient(
  options: MobileApiClientOptions = {}
): MobileApiClient {
  const cache = options.cache ?? offlineTripStore;
  const isOnline = options.isOnline ?? getIsOnline;
  const source = options.source ?? mockTripSource;

  async function loadCachedTrips(): Promise<MobileTripLoadResult> {
    const cachedTrips = await cache.readTrips();

    return {
      source: "cache",
      trips: cachedTrips.map((entry) => entry.itinerary)
    };
  }

  return {
    cacheOpenedTrip(trip) {
      return cache.cacheTrip(trip);
    },

    async listTrips() {
      try {
        if (!(await isOnline())) {
          return loadCachedTrips();
        }

        return {
          source: source.kind,
          trips: await source.listTrips()
        };
      } catch {
        return loadCachedTrips();
      }
    }
  };
}

export const mobileApiClient = createMobileApiClient();

import type { Activity } from "@japan-travel-planner/shared";

import {
  createGoogleMapsProvider,
  type MapLinkInput,
  type MapsProvider
} from "../../providers/maps/mapsProvider.js";
import type { ProviderResultCache } from "./cache.js";

const defaultMapsProvider = createGoogleMapsProvider();

export const mapLinkCacheTtlMs = 30 * 24 * 60 * 60 * 1000;

export function activityToMapLinkInput(activity: Activity): MapLinkInput {
  return {
    title: activity.title,
    location: {
      address: activity.location.address,
      city: activity.location.city,
      latitude: activity.location.latitude,
      longitude: activity.location.longitude,
      name: activity.location.name
    }
  };
}

export function createMapLink(
  input: MapLinkInput,
  provider: MapsProvider = defaultMapsProvider
) {
  try {
    return provider.createSearchLink(input);
  } catch {
    return null;
  }
}

function isCachedMapLink(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

export function normalizeMapLinkCacheInput(input: MapLinkInput) {
  return {
    ...(input.title !== undefined ? { title: input.title } : {}),
    ...(input.location !== undefined
      ? {
          location: {
            ...(input.location.address !== undefined
              ? { address: input.location.address }
              : {}),
            ...(input.location.city !== undefined
              ? { city: input.location.city }
              : {}),
            ...(input.location.latitude !== undefined
              ? { latitude: input.location.latitude }
              : {}),
            ...(input.location.longitude !== undefined
              ? { longitude: input.location.longitude }
              : {}),
            ...(input.location.name !== undefined
              ? { name: input.location.name }
              : {})
          }
        }
      : {})
  };
}

export async function createCachedMapLink(
  input: MapLinkInput,
  provider: MapsProvider,
  cache: ProviderResultCache
) {
  const result = await cache.getOrSet({
    provider: "google-maps",
    operation: "maps.link",
    input: normalizeMapLinkCacheInput(input),
    ttlMs: mapLinkCacheTtlMs,
    load: async () => createMapLink(input, provider),
    isCachedValue: isCachedMapLink
  });

  return result.value;
}

export function getActivityMapUrl(
  activity: Activity,
  provider: MapsProvider = defaultMapsProvider
) {
  const existingMapUrl = activity.location.mapUrl?.trim();

  if (existingMapUrl && existingMapUrl.length > 0) {
    return existingMapUrl;
  }

  return createMapLink(activityToMapLinkInput(activity), provider);
}

export function enrichActivityWithMapLink(
  activity: Activity,
  provider: MapsProvider = defaultMapsProvider
): Activity {
  const mapUrl = getActivityMapUrl(activity, provider);

  if (mapUrl === null) {
    return {
      ...activity,
      location: { ...activity.location }
    };
  }

  return {
    ...activity,
    location: {
      ...activity.location,
      mapUrl
    }
  };
}

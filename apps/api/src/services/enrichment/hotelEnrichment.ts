import {
  HotelProviderConfigurationError,
  HotelProviderError,
  type HotelProvider,
  type HotelSuggestion,
  type HotelSuggestionRequest
} from "../../providers/hotels/hotelProvider.js";
import type { ProviderResultCache } from "./cache.js";

export const hotelSuggestionsCacheTtlMs = 24 * 60 * 60 * 1000;

export type HotelEnrichmentResult =
  | {
      hotelSuggestions: HotelSuggestion[];
      status: "available";
    }
  | {
      hotelSuggestions: HotelSuggestion[];
      status: "empty" | "unavailable";
    };

export async function createHotelSuggestions(
  input: HotelSuggestionRequest,
  provider: HotelProvider
): Promise<HotelEnrichmentResult> {
  try {
    const hotelSuggestions = await provider.searchHotels(input);

    if (hotelSuggestions.length === 0) {
      return {
        hotelSuggestions: [],
        status: "empty"
      };
    }

    return {
      hotelSuggestions,
      status: "available"
    };
  } catch (error) {
    if (error instanceof HotelProviderConfigurationError) {
      throw error;
    }

    if (error instanceof HotelProviderError) {
      return {
        hotelSuggestions: [],
        status: "unavailable"
      };
    }

    return {
      hotelSuggestions: [],
      status: "unavailable"
    };
  }
}

function isHotelSuggestion(value: unknown): value is HotelSuggestion {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const suggestion = value as Partial<HotelSuggestion>;

  return (
    typeof suggestion.id === "string" &&
    typeof suggestion.name === "string" &&
    typeof suggestion.provider === "string" &&
    Array.isArray(suggestion.amenities) &&
    Array.isArray(suggestion.tags)
  );
}

export function isHotelEnrichmentResult(
  value: unknown
): value is HotelEnrichmentResult {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const result = value as Partial<HotelEnrichmentResult>;

  if (result.status === "available") {
    return (
      Array.isArray(result.hotelSuggestions) &&
      result.hotelSuggestions.every(isHotelSuggestion)
    );
  }

  return (
    (result.status === "empty" || result.status === "unavailable") &&
    Array.isArray(result.hotelSuggestions) &&
    result.hotelSuggestions.length === 0
  );
}

export function normalizeHotelSuggestionsCacheInput(
  input: HotelSuggestionRequest
) {
  return {
    ...(input.budget !== undefined ? { budget: input.budget } : {}),
    city: input.city,
    endDate: input.endDate,
    ...(input.latitude !== undefined ? { latitude: input.latitude } : {}),
    ...(input.longitude !== undefined ? { longitude: input.longitude } : {}),
    maxResults: input.maxResults ?? 6,
    radiusKm: input.radiusKm ?? 2,
    startDate: input.startDate
  };
}

export async function createCachedHotelSuggestions(
  input: HotelSuggestionRequest,
  provider: HotelProvider,
  cache: ProviderResultCache
): Promise<HotelEnrichmentResult> {
  const result = await cache.getOrSet({
    provider: provider.name,
    operation: "hotels.suggestions",
    input: normalizeHotelSuggestionsCacheInput(input),
    ttlMs: hotelSuggestionsCacheTtlMs,
    load: () => createHotelSuggestions(input, provider),
    isCachedValue: isHotelEnrichmentResult,
    shouldCache: (hotelResult) => hotelResult.status !== "unavailable"
  });

  return result.value;
}

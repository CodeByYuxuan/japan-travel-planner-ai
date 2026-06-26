import {
  RouteProviderConfigurationError,
  RouteProviderError,
  type RouteHint,
  type RouteHintLocation,
  type RouteHintRequest,
  type RouteHintStep,
  type RouteProvider
} from "../../providers/routes/routeProvider.js";
import type { ProviderResultCache } from "./cache.js";

export const routeHintsCacheTtlMs = 12 * 60 * 60 * 1000;

export type RouteEnrichmentResult =
  | {
      routeHints: RouteHint[];
      status: "available";
    }
  | {
      routeHints: RouteHint[];
      status: "empty" | "unavailable";
    };

export async function createRouteHints(
  input: RouteHintRequest,
  provider: RouteProvider
): Promise<RouteEnrichmentResult> {
  try {
    const routeHints = await provider.getRouteHints(input);

    if (routeHints.length === 0) {
      return {
        routeHints: [],
        status: "empty"
      };
    }

    return {
      routeHints,
      status: "available"
    };
  } catch (error) {
    if (error instanceof RouteProviderConfigurationError) {
      throw error;
    }

    if (error instanceof RouteProviderError) {
      return {
        routeHints: [],
        status: "unavailable"
      };
    }

    return {
      routeHints: [],
      status: "unavailable"
    };
  }
}

function isRouteHintLocation(value: unknown): value is RouteHintLocation {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const location = value as Partial<RouteHintLocation>;

  return typeof location.label === "string";
}

function isRouteHintStep(value: unknown): value is RouteHintStep {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const step = value as Partial<RouteHintStep>;

  return (
    (step.instruction === null || typeof step.instruction === "string") &&
    typeof step.travelMode === "string" &&
    (step.distanceMeters === null || typeof step.distanceMeters === "number") &&
    (step.durationMinutes === null ||
      typeof step.durationMinutes === "number") &&
    (step.transitLineName === null || typeof step.transitLineName === "string")
  );
}

function isRouteHint(value: unknown): value is RouteHint {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const hint = value as Partial<RouteHint>;

  return (
    typeof hint.id === "string" &&
    typeof hint.provider === "string" &&
    typeof hint.originLabel === "string" &&
    typeof hint.destinationLabel === "string" &&
    isRouteHintLocation(hint.origin) &&
    isRouteHintLocation(hint.destination) &&
    typeof hint.travelMode === "string" &&
    typeof hint.summary === "string" &&
    Array.isArray(hint.transitLineNames) &&
    Array.isArray(hint.steps) &&
    hint.steps.every(isRouteHintStep) &&
    Array.isArray(hint.warnings)
  );
}

export function isRouteEnrichmentResult(
  value: unknown
): value is RouteEnrichmentResult {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const result = value as Partial<RouteEnrichmentResult>;

  if (result.status === "available") {
    return (
      Array.isArray(result.routeHints) && result.routeHints.every(isRouteHint)
    );
  }

  return (
    (result.status === "empty" || result.status === "unavailable") &&
    Array.isArray(result.routeHints) &&
    result.routeHints.length === 0
  );
}

function normalizeLocation(input: RouteHintLocation) {
  return {
    ...(input.address !== undefined ? { address: input.address } : {}),
    label: input.label,
    ...(input.latitude !== undefined ? { latitude: input.latitude } : {}),
    ...(input.longitude !== undefined ? { longitude: input.longitude } : {})
  };
}

export function normalizeRouteHintsCacheInput(input: RouteHintRequest) {
  return {
    ...(input.city !== undefined ? { city: input.city } : {}),
    ...(input.departureTime !== undefined
      ? { departureTime: input.departureTime }
      : {}),
    destination: normalizeLocation(input.destination),
    ...(input.locale !== undefined ? { locale: input.locale } : {}),
    maxAlternatives: input.maxAlternatives ?? 1,
    origin: normalizeLocation(input.origin),
    travelMode: input.travelMode
  };
}

export async function createCachedRouteHints(
  input: RouteHintRequest,
  provider: RouteProvider,
  cache: ProviderResultCache
): Promise<RouteEnrichmentResult> {
  const result = await cache.getOrSet({
    provider: provider.name,
    operation: "routes.hints",
    input: normalizeRouteHintsCacheInput(input),
    ttlMs: routeHintsCacheTtlMs,
    load: () => createRouteHints(input, provider),
    isCachedValue: isRouteEnrichmentResult,
    shouldCache: (routeResult) => routeResult.status !== "unavailable"
  });

  return result.value;
}
